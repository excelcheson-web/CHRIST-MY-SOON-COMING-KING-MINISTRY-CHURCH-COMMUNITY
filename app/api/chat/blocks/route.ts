import { z } from 'zod'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ userId: z.string().min(1), blocked: z.boolean() })

/**
 * POST /api/chat/blocks — block or unblock someone.
 *
 * A block stops direct messages in both directions and hides that person's
 * messages from group threads *for the blocker only*. It is deliberately
 * one-sided and silent: the blocked person is never told, because telling them
 * is how blocking turns into a confrontation.
 */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = schema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid request.', 422)
  if (parsed.data.userId === user.id) return jsonError('You cannot block yourself.', 422)

  try {
    const db = requirePrisma()

    if (parsed.data.blocked) {
      await db.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: user.id, blockedId: parsed.data.userId } },
        update: {},
        create: { blockerId: user.id, blockedId: parsed.data.userId },
      })
    } else {
      await db.userBlock
        .delete({
          where: { blockerId_blockedId: { blockerId: user.id, blockedId: parsed.data.userId } },
        })
        .catch(() => null) // unblocking someone you never blocked is fine
    }

    return jsonOk({ blocked: parsed.data.blocked })
  } catch (error) {
    return databaseError('chat blocks', error)
  }
}
