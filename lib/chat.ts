import 'server-only'

import { ConversationType, Role, type PrismaClient } from '@prisma/client'

import { prisma } from '@/lib/prisma'

/**
 * Chat runs on the database alone — no socket server, no third-party realtime
 * vendor. Clients poll `Message.seq`, a Postgres sequence, so "everything after
 * 412" is a single indexed read.
 *
 * The honest trade-off: messages land in a few seconds rather than instantly.
 * Swapping in Pusher/Ably later means changing the transport in
 * `useMessageStream` and nothing else — the data model already suits it.
 */

/** Read and moderate any conversation, including ones they are not in. */
export function canModerateChat(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.PASTOR
}

/** Deterministic key so one pair of people can only ever have one thread. */
export function directKeyFor(a: string, b: string) {
  return [a, b].sort().join(':')
}

export type ChatSettings = {
  enabled: boolean
  retentionDays: number | null
  bannedWords: string[]
}

const SETTINGS_DEFAULTS: ChatSettings = { enabled: true, retentionDays: null, bannedWords: [] }

export async function getChatSettings(db: PrismaClient = prisma!): Promise<ChatSettings> {
  if (!db) return SETTINGS_DEFAULTS
  try {
    const row = await db.chatSetting.findUnique({ where: { id: 'singleton' } })
    if (!row) return SETTINGS_DEFAULTS
    return { enabled: row.enabled, retentionDays: row.retentionDays, bannedWords: row.bannedWords }
  } catch {
    return SETTINGS_DEFAULTS
  }
}

/**
 * Flags rather than blocks.
 *
 * A blocked send teaches people to route around the filter; a flagged one
 * reaches a moderator with the context intact. Matching is on word boundaries
 * so "class" does not trip a filter containing "ass".
 */
export function screenMessage(body: string, bannedWords: string[]) {
  if (bannedWords.length === 0) return { flagged: false, reason: null as string | null }

  const haystack = body.toLowerCase()
  const hits = bannedWords
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean)
    .filter((word) => new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack))

  return hits.length > 0
    ? { flagged: true, reason: `Matched filter: ${hits.join(', ')}` }
    : { flagged: false, reason: null }
}

/** Ids this person has blocked, and ids that have blocked them. */
export async function getBlockedIds(db: PrismaClient, userId: string) {
  const [made, received] = await Promise.all([
    db.userBlock.findMany({ where: { blockerId: userId }, select: { blockedId: true } }),
    db.userBlock.findMany({ where: { blockedId: userId }, select: { blockerId: true } }),
  ])
  return {
    blocked: new Set(made.map((row) => row.blockedId)),
    blockedBy: new Set(received.map((row) => row.blockerId)),
  }
}

/**
 * Finds or creates the direct thread between two people.
 *
 * Refuses in either direction: being blocked is not something the blocked
 * person should be able to work around by opening the thread themselves.
 */
export type DirectResult = { conversationId: string; error?: never } | { error: string; conversationId?: never }

export async function ensureDirectConversation(
  db: PrismaClient,
  meId: string,
  themId: string,
): Promise<DirectResult> {
  if (meId === themId) return { error: 'You cannot message yourself.' }

  const blocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: meId, blockedId: themId },
        { blockerId: themId, blockedId: meId },
      ],
    },
    select: { blockerId: true },
  })
  if (blocked) return { error: 'You cannot message this person.' }

  const them = await db.user.findUnique({
    where: { id: themId },
    select: { id: true, bannedAt: true, chatBannedAt: true },
  })
  if (!them) return { error: 'That person could not be found.' }

  const directKey = directKeyFor(meId, themId)
  const existing = await db.conversation.findUnique({ where: { directKey }, select: { id: true } })
  if (existing) return { conversationId: existing.id }

  const created = await db.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      directKey,
      createdById: meId,
      members: { create: [{ userId: meId }, { userId: themId }] },
    },
    select: { id: true },
  })

  return { conversationId: created.id }
}

type GroupKind = 'ministry' | 'smallGroup' | 'prayerGroup'

const GROUP_TYPES: Record<GroupKind, ConversationType> = {
  ministry: ConversationType.MINISTRY,
  smallGroup: ConversationType.SMALL_GROUP,
  prayerGroup: ConversationType.PRAYER_GROUP,
}

/**
 * Auto-provisions the conversation attached to a ministry, small group or
 * prayer group, and brings its membership into line.
 *
 * Called whenever someone joins or leaves, so the chat roster is derived from
 * the group roster rather than being a second list to keep in sync by hand.
 * Leaving is a soft `leftAt` so past messages keep their attribution.
 */
export async function syncGroupConversation(
  db: PrismaClient,
  kind: GroupKind,
  groupId: string,
  title: string,
  memberIds: string[],
) {
  const where =
    kind === 'ministry'
      ? { ministryId: groupId }
      : kind === 'smallGroup'
        ? { smallGroupId: groupId }
        : { prayerGroupId: groupId }

  let conversation = await db.conversation.findFirst({ where, select: { id: true } })

  if (!conversation) {
    conversation = await db.conversation.create({
      data: { type: GROUP_TYPES[kind], title, ...where },
      select: { id: true },
    })
  }

  const existing = await db.conversationMember.findMany({
    where: { conversationId: conversation.id },
    select: { userId: true, leftAt: true },
  })
  const known = new Map(existing.map((row) => [row.userId, row.leftAt]))
  const wanted = new Set(memberIds)

  const toAdd = memberIds.filter((id) => !known.has(id))
  const toRejoin = memberIds.filter((id) => known.get(id) != null)
  const toRemove = existing.filter((row) => !wanted.has(row.userId) && row.leftAt === null)

  if (toAdd.length > 0) {
    await db.conversationMember.createMany({
      data: toAdd.map((userId) => ({ conversationId: conversation!.id, userId })),
      skipDuplicates: true,
    })
  }
  if (toRejoin.length > 0) {
    await db.conversationMember.updateMany({
      where: { conversationId: conversation.id, userId: { in: toRejoin } },
      data: { leftAt: null },
    })
  }
  if (toRemove.length > 0) {
    await db.conversationMember.updateMany({
      where: { conversationId: conversation.id, userId: { in: toRemove.map((r) => r.userId) } },
      data: { leftAt: new Date() },
    })
  }

  return conversation.id
}

export type Access =
  | { ok: true; membership: { isModerator: boolean; lastReadSeq: number } | null; asModerator: boolean }
  | { ok: false; status: 404 | 403; error: string }

/**
 * The single gate every chat read and write passes through.
 *
 * A pastor or admin reading a thread they are not in is allowed but marked
 * `asModerator`, which the routes use to keep them out of the member list and
 * to stop their read pointer moving. Oversight should not look like presence.
 */
export async function checkAccess(
  db: PrismaClient,
  conversationId: string,
  user: { id: string; role: Role },
): Promise<Access> {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })
  if (!conversation) return { ok: false, status: 404, error: 'Conversation not found.' }

  const membership = await db.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId: user.id } },
    select: { isModerator: true, lastReadSeq: true, leftAt: true },
  })

  if (membership && membership.leftAt === null) {
    return {
      ok: true,
      membership: { isModerator: membership.isModerator, lastReadSeq: membership.lastReadSeq },
      asModerator: false,
    }
  }

  if (canModerateChat(user.role)) {
    return { ok: true, membership: null, asModerator: true }
  }

  // Same answer as "does not exist" — do not confirm private threads exist.
  return { ok: false, status: 404, error: 'Conversation not found.' }
}

/** Name to show for a thread; direct threads are named after the other person. */
export function conversationTitle(
  conversation: { type: ConversationType; title: string | null },
  others: { name: string }[],
) {
  if (conversation.title) return conversation.title
  if (conversation.type === ConversationType.DIRECT) {
    return others[0]?.name ?? 'Direct message'
  }
  return others.length > 0 ? others.map((o) => o.name).join(', ') : 'Conversation'
}

export const conversationTypeLabels: Record<ConversationType, string> = {
  DIRECT: 'Direct message',
  GROUP: 'Group',
  MINISTRY: 'Ministry',
  SMALL_GROUP: 'Small group',
  PRAYER_GROUP: 'Prayer group',
}

/**
 * Deletes messages past the retention window.
 *
 * TODO(phase 4F): wire to a scheduled route. It is safe to call repeatedly and
 * returns how many rows went, so an admin can also run it on demand.
 */
export async function sweepRetention(db: PrismaClient) {
  const settings = await getChatSettings(db)
  if (!settings.retentionDays || settings.retentionDays <= 0) return { deleted: 0 }

  const cutoff = new Date(Date.now() - settings.retentionDays * 24 * 60 * 60 * 1000)
  const { count } = await db.message.deleteMany({ where: { createdAt: { lt: cutoff } } })
  return { deleted: count }
}
