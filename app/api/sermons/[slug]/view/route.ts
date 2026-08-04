import { SermonStatus } from '@prisma/client'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { actorKeyFor, ensureGuestId } from '@/lib/guest-session'
import { sermonViewSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/sermons/[slug]/view — record that someone watched.
 *
 * One row per person per sermon, so `viewCount` counts people rather than page
 * refreshes. Called once when playback starts and again when it finishes, which
 * is why the second call updates progress instead of counting again.
 *
 * Deliberately never fails loudly: a broken counter must not stop a sermon
 * playing, so the player ignores the response entirely.
 */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const { body } = await readJson(request)
  const parsed = sermonViewSchema.safeParse(body ?? {})
  const progress = parsed.success ? parsed.data : { watchSeconds: 0, completed: false }

  try {
    const db = requirePrisma()
    const sermon = await db.sermon.findUnique({
      where: { slug: params.slug },
      select: { id: true, status: true },
    })
    if (!sermon || sermon.status !== SermonStatus.PUBLISHED) {
      return jsonError('We could not find that sermon.', 404)
    }

    const user = await getApiUser()
    const actorKey = actorKeyFor(user?.id, ensureGuestId())

    const existing = await db.sermonView.findUnique({
      where: { sermonId_actorKey: { sermonId: sermon.id, actorKey } },
      select: { id: true, watchSeconds: true, completed: true },
    })

    if (existing) {
      // Progress only ever moves forward — pausing and scrubbing back is not
      // "unwatching", and neither is a second visit that stops early.
      await db.sermonView.update({
        where: { id: existing.id },
        data: {
          watchSeconds: Math.max(existing.watchSeconds, progress.watchSeconds),
          completed: existing.completed || progress.completed,
        },
      })
      return jsonOk({ counted: false })
    }

    await db.$transaction([
      db.sermonView.create({
        data: {
          sermonId: sermon.id,
          userId: user?.id ?? null,
          actorKey,
          watchSeconds: progress.watchSeconds,
          completed: progress.completed,
        },
      }),
      db.sermon.update({ where: { id: sermon.id }, data: { viewCount: { increment: 1 } } }),
    ])

    return jsonOk({ counted: true })
  } catch (error) {
    return databaseError('sermon view', error)
  }
}
