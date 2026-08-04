import { ApprovalStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { testimonyCommentSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type CommentCard = { id: string; authorName: string; content: string; createdAt: string }

/** POST /api/testimonies/[id]/comments — encourage the person who shared. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  sweepRateLimits()

  const user = await getApiUser()
  if (!user) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in to comment.' }, { status: 401 })
  }

  const limit = rateLimit(`testimony-comment:${user.id}`, 30, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'You are commenting very quickly. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that.' }, { status: 400 })
  }

  const parsed = testimonyCommentSchema.safeParse(body)
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

  try {
    const db = requirePrisma()

    const testimony = await db.testimony.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })
    if (!testimony || testimony.status !== ApprovalStatus.APPROVED) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Testimony not found.' }, { status: 404 })
    }

    const comment = await db.testimonyComment.create({
      data: { testimonyId: testimony.id, authorId: user.id, content: parsed.data.content },
      select: { id: true, content: true, createdAt: true },
    })

    revalidatePath('/prayer/testimonies')
    return NextResponse.json<ApiResult<CommentCard>>(
      {
        ok: true,
        data: {
          id: comment.id,
          authorName: user.name ?? 'A friend',
          content: comment.content,
          createdAt: comment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[testimonies comments]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not save that.' }, { status: 500 })
  }
}
