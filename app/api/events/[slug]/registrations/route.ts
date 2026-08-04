import { NextResponse } from 'next/server'

import { jsonError, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Escapes a value for CSV.
 *
 * The leading-quote guard is deliberate: a name beginning =, +, - or @ is
 * treated as a formula by Excel and Sheets, which is a real injection route out
 * of a spreadsheet. Prefixing with an apostrophe makes it inert text.
 */
function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  const guarded = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${guarded.replace(/"/g, '""')}"`
}

/**
 * GET /api/events/[slug]/registrations?format=csv
 *
 * The check-in list. Contains names, emails, phone numbers and accessibility
 * needs, so it is event-managers only.
 */
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(user.role)) return jsonError('Not allowed.', 403)

  const format = new URL(request.url).searchParams.get('format')

  try {
    const db = requirePrisma()

    const event = await db.event.findUnique({
      where: { slug: params.slug },
      select: { id: true, title: true, slug: true, startsAt: true },
    })
    if (!event) return jsonError('Event not found.', 404)

    const registrations = await db.eventRegistration.findMany({
      where: { eventId: event.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      select: {
        name: true,
        email: true,
        phone: true,
        guests: true,
        status: true,
        waitlistPosition: true,
        code: true,
        accessibilityNeeds: true,
        dietaryNotes: true,
        checkedInAt: true,
        checkInMethod: true,
        createdAt: true,
      },
    })

    if (format !== 'csv') {
      return NextResponse.json({ ok: true, data: { event, registrations } })
    }

    const header = [
      'Name', 'Email', 'Phone', 'Guests', 'Seats', 'Status', 'Waitlist position',
      'Code', 'Accessibility needs', 'Dietary notes', 'Checked in at', 'Check-in method', 'Registered at',
    ]

    const rows = registrations.map((r) => [
      r.name, r.email, r.phone, r.guests, r.guests + 1, r.status, r.waitlistPosition,
      r.code, r.accessibilityNeeds, r.dietaryNotes,
      r.checkedInAt?.toISOString() ?? '', r.checkInMethod ?? '', r.createdAt.toISOString(),
    ])

    // The BOM makes Excel open UTF-8 names correctly instead of mangling them.
    const csv = '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const filename = `${event.slug}-registrations-${event.startsAt.toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[events registrations]', error)
    return jsonError('Could not load the registration list.', 500)
  }
}
