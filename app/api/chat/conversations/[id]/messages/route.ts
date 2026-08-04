import { NextResponse } from 'next/server'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canModerateChat, checkAccess, getBlockedIds, getChatSettings, screenMessage } from '@/lib/chat'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { chatMessageSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE = 60

export type ChatMessage = {
  id: string
  seq: number
  body: string
  authorId: string | null
  authorName: string
  isSystem: boolean
  isMine: boolean
  editedAt: string | null
  deletedAt: string | null
  flagged: boolean
  replyTo: { id: string; authorName: string; excerpt: string } | null
  attachments: {
    id: string
    fileName: string
    mimeType: string
    size: number
    width: number | null
    height: number | null
  }[]
  createdAt: string
}

export type MessagePage = {
  messages: ChatMessage[]
  /** Highest seq *scanned*, not merely returned — see the note below. */
  cursor: number
  hasMore: boolean
}

/**
 * GET /api/chat/conversations/[id]/messages?after=<seq>
 *
 * The polling endpoint. Without `after` it returns the tail of the thread; with
 * it, only what is new.
 *
 * The returned `cursor` is the highest seq *scanned*, not the highest returned.
 * Messages from blocked people are filtered out, and if the cursor only tracked
 * what survived filtering the client would re-request those rows forever.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const url = new URL(request.url)
  const afterRaw = url.searchParams.get('after')
  const after = afterRaw === null ? null : Number(afterRaw)
  if (after !== null && !Number.isFinite(after)) return jsonError('Invalid cursor.', 422)

  try {
    const db = requirePrisma()

    const settings = await getChatSettings(db)
    // Switched off platform-wide, but moderators keep read access so they can
    // still deal with whatever caused it to be switched off.
    if (!settings.enabled && !canModerateChat(user.role)) {
      return jsonError('Chat is switched off at the moment.', 503)
    }

    const access = await checkAccess(db, params.id, user)
    if (!access.ok) return jsonError(access.error, access.status)

    const rows = await db.message.findMany({
      where: {
        conversationId: params.id,
        ...(after !== null ? { seq: { gt: after } } : {}),
      },
      // Newest-first only when loading the tail; a delta reads forwards.
      orderBy: { seq: after !== null ? 'asc' : 'desc' },
      take: PAGE,
      select: {
        id: true,
        seq: true,
        body: true,
        authorId: true,
        isSystem: true,
        editedAt: true,
        deletedAt: true,
        flagged: true,
        createdAt: true,
        author: { select: { name: true } },
        replyTo: {
          select: { id: true, body: true, author: { select: { name: true } } },
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            mimeType: true,
            size: true,
            width: true,
            height: true,
          },
        },
      },
    })

    const window = after !== null ? rows : rows.slice().reverse()
    const highestScanned = window.reduce((max, row) => Math.max(max, row.seq), after ?? 0)

    const { blocked } = await getBlockedIds(db, user.id)

    const messages: ChatMessage[] = window
      .filter((row) => !row.authorId || !blocked.has(row.authorId))
      .map((row) => ({
        id: row.id,
        seq: row.seq,
        // A removed message keeps its place so the thread still reads sensibly.
        body: row.deletedAt ? 'This message was removed.' : row.body,
        authorId: row.authorId,
        authorName: row.isSystem ? 'CMSCK' : (row.author?.name ?? 'Former member'),
        isSystem: row.isSystem,
        isMine: row.authorId === user.id,
        editedAt: row.editedAt?.toISOString() ?? null,
        deletedAt: row.deletedAt?.toISOString() ?? null,
        flagged: row.flagged,
        replyTo: row.replyTo
          ? {
              id: row.replyTo.id,
              authorName: row.replyTo.author?.name ?? 'Former member',
              excerpt: row.replyTo.body.slice(0, 90),
            }
          : null,
        // A removed message takes its files with it.
        attachments: row.deletedAt ? [] : row.attachments,
        createdAt: row.createdAt.toISOString(),
      }))

    return NextResponse.json<ApiResult<MessagePage>>({
      ok: true,
      data: { messages, cursor: highestScanned, hasMore: after === null && rows.length === PAGE },
    })
  } catch (error) {
    return databaseError('chat messages GET', error)
  }
}

/** POST — send a message. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  sweepRateLimits()

  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const limit = rateLimit(`chat-send:${user.id}:${clientIp(request.headers)}`, 60, 60 * 1000)
  if (!limit.ok) {
    return jsonError('You are sending very quickly. Please slow down a moment.', 429)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = chatMessageSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check your message.',
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
      select: { chatBannedAt: true, chatBanReason: true },
    })
    if (me?.chatBannedAt) {
      return jsonError(me.chatBanReason || 'You cannot post in chat at the moment.', 403)
    }

    const access = await checkAccess(db, params.id, user)
    if (!access.ok) return jsonError(access.error, access.status)
    // Moderators read; they do not speak into threads they never joined.
    if (access.asModerator) return jsonError('Join this conversation before posting.', 403)

    const screened = screenMessage(parsed.data.body, settings.bannedWords)

    const message = await db.message.create({
      data: {
        conversationId: params.id,
        authorId: user.id,
        body: parsed.data.body,
        replyToId: parsed.data.replyToId,
        flagged: screened.flagged,
        flagReason: screened.reason,
      },
      select: { id: true, seq: true, createdAt: true },
    })

    // Attach only files this person uploaded into *this* conversation and that
    // are not already on another message — an id from elsewhere is ignored.
    if (parsed.data.attachmentIds.length > 0) {
      await db.attachment.updateMany({
        where: {
          id: { in: parsed.data.attachmentIds },
          conversationId: params.id,
          uploadedById: user.id,
          messageId: null,
        },
        data: { messageId: message.id },
      })
    }

    await db.$transaction([
      db.conversation.update({
        where: { id: params.id },
        data: { lastMessageAt: message.createdAt },
      }),
      // Sending is also reading — otherwise your own message shows as unread.
      db.conversationMember.update({
        where: { conversationId_userId: { conversationId: params.id, userId: user.id } },
        data: { lastReadSeq: message.seq },
      }),
    ])

    return jsonOk({ id: message.id, seq: message.seq, flagged: screened.flagged }, 201)
  } catch (error) {
    return databaseError('chat messages POST', error)
  }
}
