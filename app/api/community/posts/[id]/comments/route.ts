import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canModerateCommunity, canViewPost, loadCommunityViewer } from '@/lib/community'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { postCommentSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

const commentSelect = {
  id: true,
  body: true,
  parentId: true,
  createdAt: true,
  authorId: true,
  author: { select: { name: true, image: true, role: true } },
} as const

/** Shared by both handlers: the post, plus whether the viewer may read it. */
async function loadPost(id: string, viewerSession: Awaited<ReturnType<typeof auth>>) {
  const db = requirePrisma()
  const viewer = await loadCommunityViewer(viewerSession?.user)

  const post = await db.post.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      visibility: true,
      ministryId: true,
      smallGroupId: true,
      deletedAt: true,
    },
  })

  return { db, viewer, post: post && canViewPost(post, viewer) ? post : null }
}

/** GET /api/community/posts/[id]/comments — the thread, oldest first. */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth()
    const { db, viewer, post } = await loadPost(params.id, session)
    if (!post) return jsonError('We could not find that post.', 404)

    const rows = await db.postComment.findMany({
      where: {
        postId: post.id,
        deletedAt: null,
        // Blocking applies here too — see `postFeedWhere`.
        ...(viewer.blockedIds.length > 0 ? { authorId: { notIn: viewer.blockedIds } } : {}),
      },
      select: commentSelect,
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    return jsonOk(
      rows.map((row) => ({
        id: row.id,
        body: row.body,
        parentId: row.parentId,
        createdAt: row.createdAt.toISOString(),
        authorName: row.author.name,
        authorImage: row.author.image,
        authorRole: row.author.role,
        isMine: viewer.id === row.authorId,
        canRemove: viewer.id === row.authorId || canModerateCommunity(viewer.role),
      })),
    )
  } catch (error) {
    return databaseError('community comments GET', error)
  }
}

/** POST /api/community/posts/[id]/comments — reply to a post or a comment. */
export async function POST(request: Request, { params }: Params) {
  sweepRateLimits()

  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to reply.', 401)

  const limit = rateLimit(
    `comment:${session.user.id}:${clientIp(request.headers)}`,
    60,
    60 * 60 * 1000,
  )
  if (!limit.ok) return jsonError('That is a lot of replies at once. Please slow down.', 429)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = postCommentSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check what you wrote.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const { db, viewer, post } = await loadPost(params.id, session)
    if (!post) return jsonError('We could not find that post.', 404)

    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { bannedAt: true, chatBannedAt: true },
    })
    if (me?.bannedAt || me?.chatBannedAt) {
      return jsonError('You cannot post in the community at the moment.', 403)
    }

    /*
     * Replies are one level deep. Replying to a reply attaches to its parent
     * instead of nesting further — deep threads are unreadable on a phone, and
     * this is friendlier than refusing the reply outright.
     */
    let parentId: string | null = null
    if (parsed.data.parentId) {
      const parent = await db.postComment.findUnique({
        where: { id: parsed.data.parentId },
        select: { id: true, postId: true, parentId: true, deletedAt: true },
      })
      // A parent from a different post would smuggle a comment across scopes.
      if (!parent || parent.postId !== post.id || parent.deletedAt) {
        return jsonError('We could not find the message you replied to.', 404)
      }
      parentId = parent.parentId ?? parent.id
    }

    const [comment] = await db.$transaction([
      db.postComment.create({
        data: { postId: post.id, authorId: session.user.id, body: parsed.data.body, parentId },
        select: commentSelect,
      }),
      db.post.update({ where: { id: post.id }, data: { commentCount: { increment: 1 } } }),
    ])

    revalidatePath('/community')

    return jsonOk(
      {
        id: comment.id,
        body: comment.body,
        parentId: comment.parentId,
        createdAt: comment.createdAt.toISOString(),
        authorName: comment.author.name,
        authorImage: comment.author.image,
        authorRole: comment.author.role,
        isMine: true,
        canRemove: true,
      },
      201,
    )
  } catch (error) {
    return databaseError('community comments POST', error)
  }
}

/** DELETE /api/community/posts/[id]/comments?commentId=… — remove one reply. */
export async function DELETE(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const commentId = new URL(request.url).searchParams.get('commentId')
  if (!commentId) return jsonError('Which reply?', 422)

  try {
    const db = requirePrisma()
    const viewer = await loadCommunityViewer(session.user)

    const comment = await db.postComment.findUnique({
      where: { id: commentId },
      select: { id: true, postId: true, authorId: true, deletedAt: true },
    })
    if (!comment || comment.postId !== params.id || comment.deletedAt) {
      return jsonError('We could not find that reply.', 404)
    }
    if (comment.authorId !== viewer.id && !canModerateCommunity(viewer.role)) {
      return jsonError('That is not your reply.', 403)
    }

    await db.$transaction([
      db.postComment.update({
        where: { id: comment.id },
        data: { deletedAt: new Date(), deletedById: viewer.id },
      }),
      db.post.update({ where: { id: params.id }, data: { commentCount: { decrement: 1 } } }),
    ])

    revalidatePath('/community')
    return jsonOk({ deleted: true })
  } catch (error) {
    return databaseError('community comment DELETE', error)
  }
}
