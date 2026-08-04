import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { notifyPrayerActivity } from '@/lib/notify'
import { canModeratePrayer } from '@/lib/permissions'
import { canViewRequest, loadViewer } from '@/lib/prayer'
import { DatabaseNotConfiguredError, prisma, requirePrisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { prayerResponseSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type ResponseCard = {
  id: string
  authorName: string
  content: string
  createdAt: string
  isPrivate: boolean
}

/** GET — the encouragement thread under a request. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  if (!prisma) {
    return NextResponse.json<ApiResult<ResponseCard[]>>({ ok: true, data: [] })
  }

  const user = await getApiUser()
  const viewer = await loadViewer(user)

  try {
    const record = await prisma.prayerRequest.findUnique({
      where: { id: params.id },
      select: { authorId: true, visibility: true, status: true, groupId: true },
    })
    if (!record || !canViewRequest(record, viewer)) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Request not found.' }, { status: 404 })
    }

    // Private notes are for the requester and the prayer team only.
    const canSeePrivate =
      canModeratePrayer(viewer.role) || (viewer.id !== undefined && record.authorId === viewer.id)

    const responses = await prisma.prayerResponse.findMany({
      where: {
        requestId: params.id,
        hidden: false,
        ...(canSeePrivate ? {} : { isPrivate: false }),
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: {
        id: true,
        content: true,
        createdAt: true,
        isPrivate: true,
        guestName: true,
        author: { select: { name: true } },
      },
    })

    return NextResponse.json<ApiResult<ResponseCard[]>>({
      ok: true,
      data: responses.map((response) => ({
        id: response.id,
        authorName: response.author?.name ?? response.guestName ?? 'A friend',
        content: response.content,
        createdAt: response.createdAt.toISOString(),
        isPrivate: response.isPrivate,
      })),
    })
  } catch (error) {
    console.error('[prayer/responses GET]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not load encouragements.' }, { status: 500 })
  }
}

/** POST — leave a short encouragement or scripture. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  sweepRateLimits()

  const user = await getApiUser()
  const key = user ? `encourage-user:${user.id}` : `encourage-ip:${clientIp(request.headers)}`
  const limit = rateLimit(key, user ? 40 : 5, 60 * 60 * 1000)

  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'That is a lot of encouragements at once. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that.' }, { status: 400 })
  }

  const parsed = prayerResponseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check what you wrote and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  const viewer = await loadViewer(user)

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
        notifyOnResponse: true,
        guestName: true,
        guestEmail: true,
        author: { select: { name: true, email: true } },
      },
    })

    if (!record || !canViewRequest(record, viewer)) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Request not found.' }, { status: 404 })
    }

    const created = await db.prayerResponse.create({
      data: {
        requestId: record.id,
        authorId: user?.id,
        guestName: user ? undefined : parsed.data.guestName,
        content: parsed.data.content,
        // Only the prayer team can leave a note the public thread cannot see.
        isPrivate: parsed.data.isPrivate && canModeratePrayer(viewer.role),
      },
      select: { id: true, createdAt: true, content: true, isPrivate: true },
    })

    await notifyPrayerActivity(
      record.author ?? { name: record.guestName, email: record.guestEmail },
      { requestTitle: record.title, kind: 'encouraged', notifyOnResponse: record.notifyOnResponse },
    )

    revalidatePath('/prayer')
    return NextResponse.json<ApiResult<ResponseCard>>(
      {
        ok: true,
        data: {
          id: created.id,
          authorName: user?.name ?? parsed.data.guestName ?? 'A friend',
          content: created.content,
          createdAt: created.createdAt.toISOString(),
          isPrivate: created.isPrivate,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[prayer/responses POST]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not save that.' }, { status: 500 })
  }
}
