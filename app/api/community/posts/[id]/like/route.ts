import { Prisma } from '@prisma/client'

import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canViewPost, loadCommunityViewer } from '@/lib/community'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/community/posts/[id]/like — toggle a like.
 *
 * Signed-in only. The unique index on (postId, userId) is what actually
 * guarantees one like per person; the code below just reports the new state.
 */
export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to do that.', 401)
  const userId = session.user.id

  try {
    const db = requirePrisma()
    const viewer = await loadCommunityViewer(session.user)

    const post = await db.post.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorId: true,
        visibility: true,
        ministryId: true,
        smallGroupId: true,
        deletedAt: true,
      },
    })
    if (!post || !canViewPost(post, viewer)) return jsonError('We could not find that post.', 404)

    const existing = await db.postLike.findUnique({
      where: { postId_userId: { postId: post.id, userId } },
      select: { id: true },
    })

    if (existing) {
      const [, updated] = await db.$transaction([
        db.postLike.delete({ where: { id: existing.id } }),
        db.post.update({
          where: { id: post.id },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }),
      ])
      return jsonOk({ liked: false, likeCount: Math.max(0, updated.likeCount) })
    }

    try {
      const [, updated] = await db.$transaction([
        db.postLike.create({ data: { postId: post.id, userId } }),
        db.post.update({
          where: { id: post.id },
          data: { likeCount: { increment: 1 } },
          select: { likeCount: true },
        }),
      ])
      return jsonOk({ liked: true, likeCount: updated.likeCount })
    } catch (error) {
      /*
       * Double-tap: two requests raced past the lookup above and the second hit
       * the unique index. The person's intent was "liked", and it is — so
       * report success rather than an error they cannot act on.
       */
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const current = await db.post.findUnique({
          where: { id: post.id },
          select: { likeCount: true },
        })
        return jsonOk({ liked: true, likeCount: current?.likeCount ?? 0 })
      }
      throw error
    }
  } catch (error) {
    return databaseError('community like', error)
  }
}
