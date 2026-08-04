import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { actorKeyFor, ensureGuestId } from '@/lib/guest-session'
import { notifyPrayerActivity } from '@/lib/notify'
import { canViewRequest, loadViewer } from '@/lib/prayer'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PrayResult = { prayerCount: number; hasPrayed: boolean }

/**
 * POST /api/prayer/requests/[id]/pray — "I prayed for this".
 *
 * Idempotent by design: a unique index on (requestId, actorKey) means a refresh,
 * a double tap, or a second tab all count once. The denormalised counter and the
 * log row move together in a transaction so they cannot drift.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  const viewer = await loadViewer(user)
  const guestId = ensureGuestId()
  const actorKey = actorKeyFor(viewer.id, guestId)

  try {
    const db = requirePrisma()

    const record = await db.prayerRequest.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        authorId: true,
        visibility: true,
        status: true,
        groupId: true,
        prayerCount: true,
        notifyOnResponse: true,
        guestEmail: true,
        guestName: true,
        author: { select: { name: true, email: true } },
      },
    })

    if (!record || !canViewRequest(record, viewer)) {
      // Same answer either way — a 403 would confirm the id exists.
      return NextResponse.json<ApiResult>({ ok: false, error: 'Request not found.' }, { status: 404 })
    }

    try {
      const [, updated] = await db.$transaction([
        db.prayerLog.create({ data: { requestId: record.id, userId: viewer.id, actorKey } }),
        db.prayerRequest.update({
          where: { id: record.id },
          data: { prayerCount: { increment: 1 } },
          select: { prayerCount: true },
        }),
      ])

      await notifyPrayerActivity(
        record.author ?? { name: record.guestName, email: record.guestEmail },
        { requestTitle: record.title, kind: 'prayed', notifyOnResponse: record.notifyOnResponse },
      )

      revalidatePath('/prayer')
      return NextResponse.json<ApiResult<PrayResult>>({
        ok: true,
        data: { prayerCount: updated.prayerCount, hasPrayed: true },
      })
    } catch (error) {
      // Already prayed — report the truth rather than an error.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json<ApiResult<PrayResult>>({
          ok: true,
          data: { prayerCount: record.prayerCount, hasPrayed: true },
        })
      }
      throw error
    }
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[prayer/pray]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not record that.' }, { status: 500 })
  }
}
