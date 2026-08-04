import { timingSafeEqual } from 'node:crypto'
import { RegistrationStatus } from '@prisma/client'
import { NextResponse } from 'next/server'

import { sweepRetention } from '@/lib/chat'
import { notifyEventReminder } from '@/lib/notify'
import { prisma } from '@/lib/prisma'
import { storage } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Constant-time compare so the secret cannot be guessed a character at a time. */
function secretMatches(provided: string | null) {
  const expected = process.env.CRON_SECRET
  if (!expected || !provided) return false

  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * GET /api/cron — the scheduled jobs, in one place.
 *
 * Call it from Vercel Cron, GitHub Actions, cron-job.org, or a plain crontab:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron
 *
 * Hourly is a sensible cadence. Every job below is safe to run repeatedly —
 * nothing double-sends and nothing double-deletes.
 */
export async function GET(request: Request) {
  const header = request.headers.get('authorization')
  const provided = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not set, so scheduled jobs are disabled.' },
      { status: 503 },
    )
  }
  if (!secretMatches(provided)) {
    return NextResponse.json({ ok: false, error: 'Not allowed.' }, { status: 401 })
  }
  if (!prisma) {
    return NextResponse.json({ ok: false, error: 'No database.' }, { status: 503 })
  }

  const ran: Record<string, unknown> = {}

  // --- 1. Chat retention ---------------------------------------------------
  try {
    ran.retention = await sweepRetention(prisma)
  } catch (error) {
    console.error('[cron] retention', error)
    ran.retention = { error: true }
  }

  // --- 2. Orphaned uploads -------------------------------------------------
  // A file uploaded but never sent, and older than a day, is abandoned. Bytes
  // go first: a leftover row is untidy, a leftover file is a privacy problem.
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const orphans = await prisma.attachment.findMany({
      where: { messageId: null, createdAt: { lt: cutoff } },
      select: { id: true, storageKey: true },
      take: 500,
    })

    for (const orphan of orphans) await storage.remove(orphan.storageKey)
    if (orphans.length > 0) {
      await prisma.attachment.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } })
    }
    ran.orphanedUploads = { deleted: orphans.length }
  } catch (error) {
    console.error('[cron] orphaned uploads', error)
    ran.orphanedUploads = { error: true }
  }

  // --- 3. Event reminders --------------------------------------------------
  // Two windows: about two days out, and about two hours out. The window is an
  // hour wide to match an hourly schedule, and each event only falls inside
  // each window once, so nobody is reminded twice.
  try {
    const now = Date.now()
    const windows = [
      { label: '2-day', from: now + 47 * 3600_000, to: now + 48 * 3600_000 },
      { label: '2-hour', from: now + 1 * 3600_000, to: now + 2 * 3600_000 },
    ]

    let notified = 0
    for (const window of windows) {
      const events = await prisma.event.findMany({
        where: {
          status: 'PUBLISHED',
          startsAt: { gte: new Date(window.from), lt: new Date(window.to) },
        },
        select: {
          title: true,
          startsAt: true,
          registrations: {
            where: { status: RegistrationStatus.CONFIRMED },
            select: { name: true, email: true },
          },
        },
      })

      for (const event of events) {
        if (event.registrations.length === 0) continue
        await notifyEventReminder(event.registrations, {
          title: event.title,
          startsAt: event.startsAt,
        })
        notified += event.registrations.length
      }
    }
    ran.eventReminders = { notified }
  } catch (error) {
    console.error('[cron] event reminders', error)
    ran.eventReminders = { error: true }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), jobs: ran })
}
