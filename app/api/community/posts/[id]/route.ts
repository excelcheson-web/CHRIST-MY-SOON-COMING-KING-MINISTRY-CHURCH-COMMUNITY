import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import {
  canEditPost,
  canModerateCommunity,
  canViewPost,
  loadCommunityViewer,
  loadLikedIds,
  postCardSelect,
  toFeedPost,
} from '@/lib/community'
import { storage } from '@/lib/storage'
import { postModerationSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

/** GET /api/community/posts/[id] — one post, if the viewer may see it. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const db = requirePrisma()
    const session = await auth()
    // The community section is members-only, so its API is too. Without this
    // the pages would be behind the door while the endpoints behind them
    // answered anybody who typed the URL.
    if (!session?.user) return jsonError('Please sign in to reach the community.', 401)
    const viewer = await loadCommunityViewer(session?.user)

    const post = await db.post.findUnique({
      where: { id: params.id },
      select: { ...postCardSelect, deletedAt: true, ministryId: true, smallGroupId: true },
    })
    // 404 rather than 403 for a post they may not see: telling someone a
    // private group post exists is itself a leak.
    if (!post || !canViewPost(post, viewer)) return jsonError('We could not find that post.', 404)

    const likedIds = await loadLikedIds(viewer.id, [post.id])
    return jsonOk(toFeedPost(post, { viewer, likedIds }))
  } catch (error) {
    return databaseError('community post GET', error)
  }
}

/**
 * PATCH /api/community/posts/[id] — pin, unpin, remove or restore.
 *
 * Pinning is a leaders' tool; removing is available to the author too.
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = postModerationSchema.safeParse(body)
  if (!parsed.success) return jsonError('That is not something we can do to a post.', 422)

  try {
    const db = requirePrisma()
    const viewer = await loadCommunityViewer(session.user)

    const post = await db.post.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true, deletedAt: true },
    })
    if (!post) return jsonError('We could not find that post.', 404)

    const { action, note } = parsed.data
    const isModerator = canModerateCommunity(viewer.role)

    switch (action) {
      case 'pin':
      case 'unpin':
        if (!isModerator) return jsonError('Only leaders can pin posts.', 403)
        await db.post.update({ where: { id: post.id }, data: { pinned: action === 'pin' } })
        break

      case 'remove':
        if (!canEditPost(post, viewer)) return jsonError('That is not your post.', 403)
        // Soft delete: reports about it have to stay reviewable, and an author
        // who deletes in anger sometimes asks for it back.
        await db.post.update({
          where: { id: post.id },
          data: {
            deletedAt: new Date(),
            deletedById: viewer.id,
            pinned: false,
            ...(note ? { flagReason: note } : {}),
          },
        })
        break

      case 'restore':
        if (!isModerator) return jsonError('Only leaders can restore posts.', 403)
        await db.post.update({
          where: { id: post.id },
          data: { deletedAt: null, deletedById: null, flagged: false, flagReason: null },
        })
        break

      case 'dismiss':
        if (!isModerator) return jsonError('Only leaders can clear flags.', 403)
        await db.post.update({ where: { id: post.id }, data: { flagged: false, flagReason: null } })
        await db.postReport.updateMany({
          where: { postId: post.id, status: 'PENDING' },
          data: { status: 'DISMISSED', reviewedAt: new Date(), reviewNote: note ?? null },
        })
        break
    }

    revalidatePath('/community')
    revalidatePath('/admin/community')
    return jsonOk({ action })
  } catch (error) {
    return databaseError('community post PATCH', error)
  }
}

/**
 * DELETE /api/community/posts/[id] — erase for good. Leaders only.
 *
 * The stored picture goes with it. This is the only path that destroys
 * anything; the delete button members see soft-deletes via PATCH above.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()
    const viewer = await loadCommunityViewer(session.user)
    if (!canModerateCommunity(viewer.role)) {
      return jsonError('Only leaders can permanently delete posts.', 403)
    }

    const post = await db.post.findUnique({
      where: { id: params.id },
      select: { id: true, imageKey: true },
    })
    if (!post) return jsonError('We could not find that post.', 404)

    await db.post.delete({ where: { id: post.id } })
    // After the row, so a failed unlink cannot leave an unreachable post behind.
    if (post.imageKey) await storage.remove(post.imageKey).catch(() => undefined)

    revalidatePath('/community')
    revalidatePath('/admin/community')
    return jsonOk({ deleted: true })
  } catch (error) {
    return databaseError('community post DELETE', error)
  }
}
