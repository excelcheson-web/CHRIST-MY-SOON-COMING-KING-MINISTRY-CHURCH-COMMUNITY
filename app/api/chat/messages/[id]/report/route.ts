import { Prisma } from '@prisma/client'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { checkAccess } from '@/lib/chat'
import { reportMessageSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/messages/[id]/report
 *
 * Anyone who can see a message can report it. Reporting the same message twice
 * is a no-op rather than an error — a worried person tapping again should not
 * get told off.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = reportMessageSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please say briefly what is wrong.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()

    const message = await db.message.findUnique({
      where: { id: params.id },
      select: { id: true, conversationId: true, authorId: true },
    })
    if (!message) return jsonError('Message not found.', 404)

    const access = await checkAccess(db, message.conversationId, user)
    if (!access.ok) return jsonError(access.error, access.status)

    if (message.authorId === user.id) {
      return jsonError('You cannot report your own message — you can delete it instead.', 422)
    }

    try {
      await db.$transaction([
        db.messageReport.create({
          data: { messageId: params.id, reportedById: user.id, reason: parsed.data.reason },
        }),
        // Mark it in the thread too, so a moderator scrolling past sees it
        // without having to cross-reference the reports queue.
        db.message.update({
          where: { id: params.id },
          data: { flagged: true, flagReason: 'Reported by a member' },
        }),
      ])
    } catch (error) {
      // Already reported by this person — the desired state either way.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return jsonOk({ reported: true, alreadyReported: true })
      }
      throw error
    }

    return jsonOk({ reported: true, alreadyReported: false }, 201)
  } catch (error) {
    return databaseError('chat report', error)
  }
}
