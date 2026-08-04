import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canModerateCommunity } from '@/lib/community'
import { helpReplySchema, helpStatusSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

/** GET /api/community/help/[id] — one post and its replies. Members only. */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()
    const post = await db.helpPost.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, name: true, image: true } },
        claimedBy: { select: { id: true, name: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { id: true, name: true, image: true } } },
        },
      },
    })
    if (!post) return jsonError('We could not find that.', 404)

    return jsonOk({
      ...post,
      createdAt: post.createdAt.toISOString(),
      isMine: post.authorId === session.user.id,
      replies: post.replies.map((reply) => ({
        ...reply,
        createdAt: reply.createdAt.toISOString(),
        isMine: reply.authorId === session.user.id,
      })),
    })
  } catch (error) {
    return databaseError('help detail', error)
  }
}

/** POST /api/community/help/[id] — reply, usually "I can do that". */
export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = helpReplySchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check what you wrote.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const post = await db.helpPost.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    })
    if (!post) return jsonError('We could not find that.', 404)
    if (post.status === 'CANCELLED' || post.status === 'DONE') {
      return jsonError('That one is already finished.', 409)
    }

    const reply = await db.helpReply.create({
      data: { postId: post.id, authorId: session.user.id, body: parsed.data.body },
      include: { author: { select: { id: true, name: true, image: true } } },
    })

    revalidatePath('/community/help')
    return jsonOk({ ...reply, createdAt: reply.createdAt.toISOString(), isMine: true }, 201)
  } catch (error) {
    return databaseError('help reply', error)
  }
}

/**
 * PATCH /api/community/help/[id] — accept an offer, or close it off.
 *
 * Only the person who posted decides who helps them. A leader can close an
 * abandoned post, but cannot pick somebody on the author's behalf.
 */
export async function PATCH(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = helpStatusSchema.safeParse(body)
  if (!parsed.success) return jsonError('That is not something we can do.', 422)

  try {
    const db = requirePrisma()
    const post = await db.helpPost.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    })
    if (!post) return jsonError('We could not find that.', 404)

    const isAuthor = post.authorId === session.user.id
    const isLeader = canModerateCommunity(session.user.role)
    if (!isAuthor && !isLeader) return jsonError('That is not your post.', 403)

    const { status, claimedById } = parsed.data
    if (claimedById && !isAuthor) {
      return jsonError('Only the person who asked can choose who helps.', 403)
    }

    const updated = await db.helpPost.update({
      where: { id: post.id },
      data: {
        status,
        ...(status === 'CLAIMED'
          ? { claimedById: claimedById ?? null, claimedAt: new Date() }
          : {}),
        ...(status === 'OPEN' ? { claimedById: null, claimedAt: null, closedAt: null } : {}),
        ...(status === 'DONE' || status === 'CANCELLED' ? { closedAt: new Date() } : {}),
      },
      select: { id: true, status: true, claimedById: true },
    })

    revalidatePath('/community/help')
    return jsonOk(updated)
  } catch (error) {
    return databaseError('help PATCH', error)
  }
}

/** DELETE /api/community/help/[id] — remove it. Author or leader. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()
    const post = await db.helpPost.findUnique({
      where: { id: params.id },
      select: { id: true, authorId: true },
    })
    if (!post) return jsonError('We could not find that.', 404)
    if (post.authorId !== session.user.id && !canModerateCommunity(session.user.role)) {
      return jsonError('That is not your post.', 403)
    }

    await db.helpPost.delete({ where: { id: post.id } })
    revalidatePath('/community/help')
    return jsonOk({ deleted: true })
  } catch (error) {
    return databaseError('help DELETE', error)
  }
}
