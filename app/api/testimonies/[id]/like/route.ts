import { ApprovalStatus, Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LikeResult = { likeCount: number; liked: boolean }

/**
 * POST /api/testimonies/[id]/like — toggle a like.
 *
 * Members only, so it cannot be inflated anonymously. The counter and the like
 * row move together in a transaction.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in to encourage.' }, { status: 401 })
  }

  try {
    const db = requirePrisma()

    const testimony = await db.testimony.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, likeCount: true },
    })
    if (!testimony || testimony.status !== ApprovalStatus.APPROVED) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Testimony not found.' }, { status: 404 })
    }

    const existing = await db.testimonyLike.findUnique({
      where: { testimonyId_userId: { testimonyId: testimony.id, userId: user.id } },
      select: { id: true },
    })

    if (existing) {
      const [, updated] = await db.$transaction([
        db.testimonyLike.delete({ where: { id: existing.id } }),
        db.testimony.update({
          where: { id: testimony.id },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }),
      ])

      revalidatePath('/prayer/testimonies')
      return NextResponse.json<ApiResult<LikeResult>>({
        ok: true,
        data: { likeCount: Math.max(0, updated.likeCount), liked: false },
      })
    }

    try {
      const [, updated] = await db.$transaction([
        db.testimonyLike.create({ data: { testimonyId: testimony.id, userId: user.id } }),
        db.testimony.update({
          where: { id: testimony.id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        }),
      ])

      revalidatePath('/prayer/testimonies')
      return NextResponse.json<ApiResult<LikeResult>>({
        ok: true,
        data: { likeCount: updated.likeCount, liked: true },
      })
    } catch (error) {
      // Two tabs raced; the like already exists, which is the desired state.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json<ApiResult<LikeResult>>({
          ok: true,
          data: { likeCount: testimony.likeCount, liked: true },
        })
      }
      throw error
    }
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[testimonies like]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not save that.' }, { status: 500 })
  }
}
