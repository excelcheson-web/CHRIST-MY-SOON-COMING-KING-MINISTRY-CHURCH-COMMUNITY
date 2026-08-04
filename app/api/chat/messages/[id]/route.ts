import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canModerateChat, checkAccess } from '@/lib/chat'
import { chatMessageSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** PATCH — edit your own message. Moderators do not get to rewrite people. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = chatMessageSchema.safeParse(body)
  if (!parsed.success) return jsonError('Please check your message.', 422)

  try {
    const db = requirePrisma()

    const message = await db.message.findUnique({
      where: { id: params.id },
      select: { authorId: true, conversationId: true, deletedAt: true },
    })
    if (!message) return jsonError('Message not found.', 404)
    if (message.deletedAt) return jsonError('That message was removed.', 409)

    // Editing is the author's alone. A moderator can remove a message but
    // must not be able to put different words in somebody's mouth.
    if (message.authorId !== user.id) return jsonError('You can only edit your own messages.', 403)

    const access = await checkAccess(db, message.conversationId, user)
    if (!access.ok) return jsonError(access.error, access.status)

    await db.message.update({
      where: { id: params.id },
      data: { body: parsed.data.body, editedAt: new Date() },
    })

    return jsonOk({ id: params.id, edited: true })
  } catch (error) {
    return databaseError('chat message PATCH', error)
  }
}

/**
 * DELETE — soft-delete. The author or a moderator may remove a message.
 *
 * The row stays so any report about it remains reviewable, and so the thread
 * does not silently rewrite itself around the gap.
 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()

    const message = await db.message.findUnique({
      where: { id: params.id },
      select: { authorId: true, conversationId: true, deletedAt: true },
    })
    if (!message) return jsonError('Message not found.', 404)
    if (message.deletedAt) return jsonOk({ id: params.id, alreadyDeleted: true })

    const access = await checkAccess(db, message.conversationId, user)
    if (!access.ok) return jsonError(access.error, access.status)

    const isAuthor = message.authorId === user.id
    const isModerator = access.membership?.isModerator || canModerateChat(user.role)
    if (!isAuthor && !isModerator) return jsonError('Not allowed.', 403)

    await db.message.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), deletedById: user.id },
    })

    return jsonOk({ id: params.id, alreadyDeleted: false })
  } catch (error) {
    return databaseError('chat message DELETE', error)
  }
}
