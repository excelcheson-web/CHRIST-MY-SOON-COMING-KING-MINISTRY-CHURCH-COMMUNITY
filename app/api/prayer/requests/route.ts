import { PrayerUrgency, PrayerVisibility, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { actorKeyFor, ensureGuestId } from '@/lib/guest-session'
import { notifyGroupLeader, notifyPrayerReceived, notifyPrayerTeamUrgent } from '@/lib/notify'
import { prayerTeamRoles } from '@/lib/permissions'
import {
  loadPrayedIds,
  loadViewer,
  prayerCardSelect,
  prayerWallWhere,
  toWallCard,
  type WallCard,
} from '@/lib/prayer'
import { DatabaseNotConfiguredError, prisma, requirePrisma } from '@/lib/prisma'
import { clientIp, peekRateLimit, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { prayerCategories, prayerRequestSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * GET /api/prayer/requests — the wall.
 *
 * The visibility filter comes from `prayerWallWhere` and is never assembled
 * here; see the note at the top of `lib/prayer.ts` for why.
 */
export async function GET(request: Request) {
  if (!prisma) {
    return NextResponse.json<ApiResult<{ requests: WallCard[]; total: number }>>({
      ok: true,
      data: { requests: [], total: 0 },
    })
  }

  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const urgency = url.searchParams.get('urgency')
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)

  const user = await getApiUser()
  const viewer = await loadViewer(user)
  const guestId = ensureGuestId()
  const actorKey = actorKeyFor(viewer.id, guestId)

  const where: Prisma.PrayerRequestWhereInput = {
    AND: [
      prayerWallWhere(viewer),
      ...(category && prayerCategories.includes(category as (typeof prayerCategories)[number])
        ? [{ category: category as (typeof prayerCategories)[number] }]
        : []),
      ...(urgency && urgency in PrayerUrgency ? [{ urgency: urgency as PrayerUrgency }] : []),
    ],
  }

  try {
    const [total, records] = await Promise.all([
      prisma.prayerRequest.count({ where }),
      prisma.prayerRequest.findMany({
        where,
        select: prayerCardSelect,
        // Urgent needs float to the top; otherwise newest first.
        orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
    ])

    const prayedIds = await loadPrayedIds(
      actorKey,
      records.map((record) => record.id),
    )

    return NextResponse.json<ApiResult<{ requests: WallCard[]; total: number; page: number }>>({
      ok: true,
      data: {
        requests: records.map((record) => toWallCard(record, { viewerId: viewer.id, prayedIds })),
        total,
        page,
      },
    })
  } catch (error) {
    console.error('[prayer/requests GET]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not load the prayer wall.' }, { status: 500 })
  }
}

/** POST /api/prayer/requests — submit a request. Open to guests and members. */
export async function POST(request: Request) {
  sweepRateLimits()

  const user = await getApiUser()
  const ip = clientIp(request.headers)

  // Two buckets on purpose.
  //
  // The submission bucket is small and precious — guests get one request a day
  // — so it is only *consumed* after a successful write. Otherwise a typo in
  // the title would lock somebody out of asking for prayer for 24 hours.
  // A separate, generous attempts bucket still stops anyone hammering the
  // endpoint with junk.
  const submitKey = user ? `prayer-member:${user.id}` : `prayer-guest:${ip}`
  const submitMax = user ? 20 : 1

  const attempts = rateLimit(`prayer-attempt:${ip}`, 40, 60 * 60 * 1000)
  if (!attempts.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(attempts.retryAfterSeconds) } },
    )
  }

  const quota = peekRateLimit(submitKey, submitMax)
  if (!quota.ok) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: user
          ? 'You have submitted a lot of requests today. Please come back tomorrow — we are still praying.'
          : 'Guests can send one request a day. Create a free account to send more, or come back tomorrow.',
      },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that request.' }, { status: 400 })
  }

  const parsed = prayerRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the highlighted fields and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  const input = parsed.data

  // Guests must leave a name so the prayer team knows who they are praying for.
  if (!user && !input.guestName) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please tell us your name.',
        fieldErrors: { guestName: ['Please tell us your name.'] },
      },
      { status: 422 },
    )
  }

  try {
    const db = requirePrisma()

    // A request can only be shared into a group the author actually belongs to.
    let groupId: string | undefined
    if (input.groupId && user) {
      const membership = await db.prayerGroupMember.findUnique({
        where: { groupId_userId: { groupId: input.groupId, userId: user.id } },
        select: { groupId: true },
      })
      groupId = membership?.groupId
    }

    const created = await db.prayerRequest.create({
      data: {
        title: input.title,
        content: input.content,
        category: input.category,
        urgency: input.urgency,
        // Guests cannot post members-only requests they could not then read.
        visibility: user ? input.visibility : PrayerVisibility.PUBLIC,
        anonymous: input.anonymous,
        verse: input.verse,
        imageUrl: input.imageUrl,
        notifyOnResponse: input.notifyOnResponse,
        authorId: user?.id,
        guestName: user ? undefined : input.guestName,
        guestEmail: user ? undefined : input.guestEmail,
        groupId,
      },
      select: { id: true, title: true, urgency: true, visibility: true },
    })

    // Only a real, saved request counts against the daily allowance.
    rateLimit(submitKey, submitMax, DAY_MS)

    const recipient = user
      ? { name: user.name ?? null, email: user.email ?? null }
      : { name: input.guestName ?? null, email: input.guestEmail ?? null }

    await notifyPrayerReceived(recipient, created.title)

    // HIGH and URGENT wake the intercessor rota (title only, never the content).
    if (created.urgency === PrayerUrgency.HIGH || created.urgency === PrayerUrgency.URGENT) {
      const team = await db.user.findMany({
        where: { role: { in: prayerTeamRoles }, availableForFollowUp: true, bannedAt: null },
        select: { name: true, email: true },
      })
      await notifyPrayerTeamUrgent(team, {
        requestTitle: created.title,
        urgency: created.urgency,
        isPrivate: created.visibility === PrayerVisibility.PRIVATE,
      })
    }

    if (groupId) {
      const group = await db.prayerGroup.findUnique({
        where: { id: groupId },
        select: { name: true, leader: { select: { name: true, email: true } } },
      })
      if (group?.leader) {
        await notifyGroupLeader(group.leader, {
          groupName: group.name,
          requestTitle: created.title,
        })
      }
    }

    revalidatePath('/prayer')
    return NextResponse.json<ApiResult<{ id: string }>>({ ok: true, data: { id: created.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error:
            'Our prayer wall is not switched on yet. Please use the contact details in the footer — we would still love to pray with you.',
        },
        { status: 503 },
      )
    }
    console.error('[prayer/requests POST]', error)
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 },
    )
  }
}
