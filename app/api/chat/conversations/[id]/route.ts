import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { checkAccess } from '@/lib/chat'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  /** Move the read pointer. Send the highest seq you have displayed. */
  lastReadSeq: z.coerce.number().int().min(0).optional(),
  muted: z.boolean().optional(),
  /** Soft-leave the conversation. */
  leave: z.boolean().optional(),
})

/**
 * PATCH /api/chat/conversations/[id]
 *
 * Marking read, muting and leaving are all one small write on the membership
 * row, so they share a route rather than getting three near-identical files.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid request.', 422)

  try {
    const db = requirePrisma()

    const access = await checkAccess(db, params.id, user)
    if (!access.ok) return jsonError(access.error, access.status)
    // A moderator reading a thread should not leave footprints in it.
    if (access.asModerator) return jsonOk({ noop: true })

    const { lastReadSeq, muted, leave } = parsed.data

    const updated = await db.conversationMember.update({
      where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
      data: {
        // Never move the pointer backwards — a stale tab must not resurrect
        // messages the person has already read elsewhere.
        ...(lastReadSeq !== undefined
          ? { lastReadSeq: Math.max(lastReadSeq, access.membership?.lastReadSeq ?? 0) }
          : {}),
        ...(muted !== undefined ? { muted } : {}),
        ...(leave ? { leftAt: new Date() } : {}),
      },
      select: { lastReadSeq: true, muted: true, leftAt: true },
    })

    return jsonOk(updated)
  } catch (error) {
    return databaseError('chat conversation PATCH', error)
  }
}
