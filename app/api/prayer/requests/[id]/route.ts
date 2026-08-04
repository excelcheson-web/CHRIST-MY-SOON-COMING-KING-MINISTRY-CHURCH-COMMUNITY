import { PrayerStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { canModeratePrayer } from '@/lib/permissions'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { prayerModerateSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * PATCH /api/prayer/requests/[id] — moderation.
 *
 * Mark answered (with the story of how), flag, or note that this one needs a
 * pastor. Prayer team, pastors and admins only.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })
  if (!canModeratePrayer(user.role)) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Not allowed.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that.' }, { status: 400 })
  }

  const parsed = prayerModerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the form.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  const { status, answerNote, flagged, flagReason, needsPastoralFollowUp } = parsed.data

  try {
    const db = requirePrisma()

    const updated = await db.prayerRequest.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(answerNote !== undefined ? { answerNote } : {}),
        ...(flagged !== undefined ? { flagged } : {}),
        ...(flagReason !== undefined ? { flagReason } : {}),
        ...(needsPastoralFollowUp !== undefined ? { needsPastoralFollowUp } : {}),
        // Stamp the moment it was marked answered; clear it if reopened.
        ...(status === PrayerStatus.ANSWERED
          ? { answeredAt: new Date() }
          : status
            ? { answeredAt: null }
            : {}),
      },
      select: { id: true, status: true },
    })

    revalidatePath('/prayer')
    revalidatePath('/admin/prayer')
    return NextResponse.json<ApiResult<typeof updated>>({ ok: true, data: updated })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'No database is connected yet.' }, { status: 503 })
    }
    console.error('[prayer/requests PATCH]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not save that.' }, { status: 500 })
  }
}

/**
 * DELETE /api/prayer/requests/[id]
 *
 * The author may withdraw their own request; moderators may remove anything.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })

  try {
    const db = requirePrisma()

    const record = await db.prayerRequest.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    })
    if (!record) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Request not found.' }, { status: 404 })
    }

    const isAuthor = record.authorId === user.id
    if (!isAuthor && !canModeratePrayer(user.role)) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not allowed.' }, { status: 403 })
    }

    await db.prayerRequest.delete({ where: { id: params.id } })

    revalidatePath('/prayer')
    revalidatePath('/admin/prayer')
    return NextResponse.json<ApiResult<{ id: string }>>({ ok: true, data: { id: params.id } })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'No database is connected yet.' }, { status: 503 })
    }
    console.error('[prayer/requests DELETE]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not remove that.' }, { status: 500 })
  }
}
