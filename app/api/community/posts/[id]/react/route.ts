import { Prisma } from '@prisma/client'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canViewPost, loadCommunityViewer, loadReactions } from '@/lib/community'
import { reactionSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/community/posts/[id]/react — set, change or clear my reaction.
 *
 * One row per person per post with the type as a column, so changing your mind
 * updates rather than stacking. Sending the type you already have clears it,
 * which is what pressing the same button twice should do.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to react.', 401)
  const userId = session.user.id

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = reactionSchema.safeParse(body ?? {})
  if (!parsed.success) return jsonError('That is not a reaction we know.', 422)

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

    const existing = await db.postReaction.findUnique({
      where: { postId_userId: { postId: post.id, userId } },
      select: { id: true, type: true },
    })

    const wanted = parsed.data.type
    const clearing = wanted === null || (existing && existing.type === wanted)

    if (clearing) {
      if (existing) await db.postReaction.delete({ where: { id: existing.id } })
    } else if (existing) {
      await db.postReaction.update({ where: { id: existing.id }, data: { type: wanted } })
    } else {
      try {
        await db.postReaction.create({ data: { postId: post.id, userId, type: wanted } })
      } catch (error) {
        // Two taps raced past the lookup. The person's intent is recorded
        // either way, so settle on what they asked for rather than erroring.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          await db.postReaction.update({
            where: { postId_userId: { postId: post.id, userId } },
            data: { type: wanted },
          })
        } else {
          throw error
        }
      }
    }

    // Return the fresh tally so the button never disagrees with the count.
    const state = await loadReactions(userId, [post.id])
    return jsonOk({
      myReaction: state.mine.get(post.id) ?? null,
      reactions: state.tally.get(post.id) ?? [],
    })
  } catch (error) {
    return databaseError('community react', error)
  }
}
