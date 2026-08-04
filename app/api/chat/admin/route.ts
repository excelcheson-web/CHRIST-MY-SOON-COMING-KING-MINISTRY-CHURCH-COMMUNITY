import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canModerateChat, sweepRetention } from '@/lib/chat'
import { chatBanSchema, chatSettingsSchema, reportReviewSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('settings'), payload: chatSettingsSchema }),
  z.object({ action: z.literal('ban'), payload: chatBanSchema }),
  z.object({
    action: z.literal('review'),
    payload: reportReviewSchema.and(z.object({ reportId: z.string().min(1) })),
  }),
  z.object({ action: z.literal('sweep') }),
])

/**
 * POST /api/chat/admin — every moderation action, discriminated by `action`.
 *
 * One route because these are all small, all admin-only, and all invalidate the
 * same page. Splitting them would be four files of identical guard code.
 */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canModerateChat(user.role)) {
    return jsonError('Only pastors and administrators can moderate chat.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return jsonError('Invalid request.', 422)

  try {
    const db = requirePrisma()

    if (parsed.data.action === 'settings') {
      const { enabled, retentionDays, bannedWords } = parsed.data.payload
      const saved = await db.chatSetting.upsert({
        where: { id: 'singleton' },
        update: {
          ...(enabled !== undefined ? { enabled } : {}),
          retentionDays,
          bannedWords,
        },
        create: {
          id: 'singleton',
          enabled: enabled ?? true,
          retentionDays,
          bannedWords,
        },
      })
      revalidatePath('/admin/chat')
      return jsonOk({ settings: saved })
    }

    if (parsed.data.action === 'ban') {
      const { userId, banned, reason } = parsed.data.payload
      if (userId === user.id) return jsonError('You cannot ban yourself.', 422)

      await db.user.update({
        where: { id: userId },
        data: {
          chatBannedAt: banned ? new Date() : null,
          chatBanReason: banned ? (reason ?? 'Removed from chat by a moderator.') : null,
        },
      })
      revalidatePath('/admin/chat')
      return jsonOk({ userId, banned })
    }

    if (parsed.data.action === 'review') {
      const { reportId, status, reviewNote, deleteMessage } = parsed.data.payload

      const report = await db.messageReport.findUnique({
        where: { id: reportId },
        select: { messageId: true },
      })
      if (!report) return jsonError('Report not found.', 404)

      await db.messageReport.update({
        where: { id: reportId },
        data: { status, reviewNote, reviewedById: user.id, reviewedAt: new Date() },
      })

      if (deleteMessage) {
        await db.message.update({
          where: { id: report.messageId },
          data: { deletedAt: new Date(), deletedById: user.id },
        })
      } else if (status === 'DISMISSED') {
        // Nothing wrong after all — clear the flag so the thread reads normally.
        await db.message.update({
          where: { id: report.messageId },
          data: { flagged: false, flagReason: null },
        })
      }

      revalidatePath('/admin/chat')
      return jsonOk({ reportId, status })
    }

    const result = await sweepRetention(db)
    revalidatePath('/admin/chat')
    return jsonOk(result)
  } catch (error) {
    return databaseError('chat admin', error)
  }
}
