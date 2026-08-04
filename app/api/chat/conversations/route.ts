import { ConversationType } from '@prisma/client'
import { NextResponse } from 'next/server'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { conversationTitle, ensureDirectConversation, getChatSettings } from '@/lib/chat'
import { startConversationSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type ConversationSummary = {
  id: string
  type: ConversationType
  title: string
  lastMessage: string | null
  lastMessageAt: string | null
  unread: number
  muted: boolean
  memberCount: number
}

/** GET /api/chat/conversations — the inbox, with unread counts. */
export async function GET() {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()

    const memberships = await db.conversationMember.findMany({
      where: { userId: user.id, leftAt: null },
      select: {
        muted: true,
        lastReadSeq: true,
        conversation: {
          select: {
            id: true,
            type: true,
            title: true,
            lastMessageAt: true,
            members: {
              where: { userId: { not: user.id }, leftAt: null },
              select: { user: { select: { name: true } } },
              take: 8,
            },
            _count: { select: { members: true } },
            messages: {
              orderBy: { seq: 'desc' },
              take: 1,
              select: { body: true, deletedAt: true, author: { select: { name: true } } },
            },
          },
        },
      },
    })

    // One grouped count for every thread rather than a query per row.
    const unreadRows = await db.message.groupBy({
      by: ['conversationId'],
      where: {
        OR: memberships.map((m) => ({
          conversationId: m.conversation.id,
          seq: { gt: m.lastReadSeq },
        })),
        authorId: { not: user.id },
      },
      _count: { _all: true },
    })
    const unreadByConversation = new Map(unreadRows.map((r) => [r.conversationId, r._count._all]))

    const conversations: ConversationSummary[] = memberships
      .map((m) => {
        const c = m.conversation
        const last = c.messages[0]

        return {
          id: c.id,
          type: c.type,
          title: conversationTitle(c, c.members.map((row) => row.user)),
          lastMessage: last ? (last.deletedAt ? 'Message removed' : last.body.slice(0, 120)) : null,
          lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
          unread: unreadByConversation.get(c.id) ?? 0,
          muted: m.muted,
          memberCount: c._count.members,
        }
      })
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))

    return NextResponse.json<ApiResult<ConversationSummary[]>>({ ok: true, data: conversations })
  } catch (error) {
    return databaseError('chat conversations GET', error)
  }
}

/** POST — start a direct thread, or create a named group. */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = startConversationSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()

    const settings = await getChatSettings(db)
    if (!settings.enabled) return jsonError('Chat is switched off at the moment.', 503)

    const me = await db.user.findUnique({
      where: { id: user.id },
      select: { chatBannedAt: true },
    })
    if (me?.chatBannedAt) return jsonError('You cannot start conversations at the moment.', 403)

    const directWith = parsed.data.userId
    if (directWith) {
      const result = await ensureDirectConversation(db, user.id, directWith)
      if (result.error) return jsonError(result.error, 409)
      return jsonOk({ id: result.conversationId }, 201)
    }

    const others = [...new Set(parsed.data.userIds ?? [])].filter((id) => id !== user.id)
    if (others.length === 0) return jsonError('Choose at least one other person.', 422)

    const conversation = await db.conversation.create({
      data: {
        type: ConversationType.GROUP,
        title: parsed.data.title ?? null,
        createdById: user.id,
        members: {
          create: [
            { userId: user.id, isModerator: true },
            ...others.map((userId) => ({ userId })),
          ],
        },
      },
      select: { id: true },
    })

    return jsonOk({ id: conversation.id }, 201)
  } catch (error) {
    return databaseError('chat conversations POST', error)
  }
}
