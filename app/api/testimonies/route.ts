import { ApprovalStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { notifyTestimonySubmitted } from '@/lib/notify'
import { DatabaseNotConfiguredError, prisma, requirePrisma } from '@/lib/prisma'
import { clientIp, peekRateLimit, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { uniqueSlug } from '@/lib/slug'
import { testimonySchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

/** GET /api/testimonies — approved stories only. */
export async function GET(request: Request) {
  if (!prisma) return NextResponse.json<ApiResult<unknown[]>>({ ok: true, data: [] })

  const featuredOnly = new URL(request.url).searchParams.get('featured') === '1'

  try {
    const testimonies = await prisma.testimony.findMany({
      where: {
        status: ApprovalStatus.APPROVED,
        ...(featuredOnly ? { isFeatured: true } : {}),
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        category: true,
        likeCount: true,
        isFeatured: true,
        createdAt: true,
        anonymous: true,
        guestName: true,
        author: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    })

    return NextResponse.json<ApiResult<unknown[]>>({
      ok: true,
      data: testimonies.map((testimony) => ({
        id: testimony.id,
        slug: testimony.slug,
        title: testimony.title,
        content: testimony.content,
        category: testimony.category,
        likeCount: testimony.likeCount,
        commentCount: testimony._count.comments,
        isFeatured: testimony.isFeatured,
        createdAt: testimony.createdAt.toISOString(),
        // Anonymity resolved here so no template can leak the author.
        authorName: testimony.anonymous
          ? 'Anonymous'
          : (testimony.author?.name ?? testimony.guestName ?? 'A friend'),
      })),
    })
  } catch (error) {
    console.error('[testimonies GET]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not load testimonies.' }, { status: 500 })
  }
}

/**
 * POST /api/testimonies — share a story.
 *
 * Always lands as PENDING. Per the plan, testimonies are approved before they
 * appear; prayer requests are auto-approved with flagging. The difference is
 * deliberate — a testimony is a permanent published page, a prayer request is a
 * transient ask.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const user = await getApiUser()
  const ip = clientIp(request.headers)

  // As in /api/prayer/requests: the daily allowance is only consumed by a
  // successful submission, so a validation slip never costs someone their turn.
  const submitKey = user ? `testimony-user:${user.id}` : `testimony-ip:${ip}`
  const submitMax = user ? 5 : 1

  const attempts = rateLimit(`testimony-attempt:${ip}`, 30, 60 * 60 * 1000)
  if (!attempts.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(attempts.retryAfterSeconds) } },
    )
  }

  const quota = peekRateLimit(submitKey, submitMax)
  if (!quota.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Thank you — you have already shared today. Please come back tomorrow.' },
      { status: 429, headers: { 'Retry-After': String(quota.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that.' }, { status: 400 })
  }

  const parsed = testimonySchema.safeParse(body)
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

  if (!user && !input.guestName) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Please tell us your name.', fieldErrors: { guestName: ['Please tell us your name.'] } },
      { status: 422 },
    )
  }

  try {
    const db = requirePrisma()

    const slug = await uniqueSlug(input.title, async (candidate) =>
      Boolean(await db.testimony.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const created = await db.testimony.create({
      data: {
        title: input.title,
        slug,
        content: input.content,
        category: input.category,
        anonymous: input.anonymous,
        authorId: user?.id,
        guestName: user ? undefined : input.guestName,
        guestEmail: user ? undefined : input.guestEmail,
        status: ApprovalStatus.PENDING,
      },
      select: { id: true, title: true },
    })

    rateLimit(submitKey, submitMax, DAY_MS)

    await notifyTestimonySubmitted(
      user ? { name: user.name ?? null, email: user.email ?? null } : { name: input.guestName ?? null, email: input.guestEmail ?? null },
      created.title,
    )

    revalidatePath('/admin/testimonies')
    return NextResponse.json<ApiResult<{ id: string }>>({ ok: true, data: { id: created.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error:
            'We cannot take stories online just yet. Please use the contact details in the footer — we would love to hear it.',
        },
        { status: 503 },
      )
    }
    console.error('[testimonies POST]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
