import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { canModeratePrayer } from '@/lib/permissions'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { groupPostSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/prayer/groups/[slug]/posts — the group discussion board.
 *
 * Members only, and membership is checked against the database rather than
 * trusted from the page that rendered the form.
 */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  sweepRateLimits()

  const user = await getApiUser()
  if (!user) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })
  }

  const limit = rateLimit(`group-post:${user.id}:${clientIp(request.headers)}`, 30, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'You are posting very quickly. Please take a breath and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that.' }, { status: 400 })
  }

  try {
    const db = requirePrisma()

    const group = await db.prayerGroup.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true },
    })
    if (!group || !group.isActive) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Group not found.' }, { status: 404 })
    }

    const parsed = groupPostSchema.safeParse({ ...(body as object), groupId: group.id })
    if (!parsed.success) {
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error: 'Please check what you wrote.',
          fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
        },
        { status: 422 },
      )
    }

    const membership = await db.prayerGroupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      select: { id: true },
    })

    if (!membership && !canModeratePrayer(user.role)) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'Join the group before posting.' },
        { status: 403 },
      )
    }

    const post = await db.prayerGroupPost.create({
      data: { groupId: group.id, authorId: user.id, content: parsed.data.content },
      select: { id: true, content: true, createdAt: true },
    })

    revalidatePath(`/prayer/groups/${params.slug}`)
    return NextResponse.json<ApiResult<{ id: string }>>({ ok: true, data: { id: post.id } }, { status: 201 })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[prayer/groups posts]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not post that.' }, { status: 500 })
  }
}
