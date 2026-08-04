import 'server-only'

import {
  Prisma,
  PrayerStatus,
  PrayerVisibility,
  type PrayerCategory,
  type PrayerUrgency,
  type Role,
} from '@prisma/client'

import { canModeratePrayer } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

/**
 * Who is allowed to see which prayer requests.
 *
 * All of it lives here, in one function, deliberately. Prayer requests are the
 * most sensitive data in the platform — someone wrote "my marriage is failing"
 * and ticked *Private*. Scattering visibility checks across pages and routes is
 * how that ends up on a public wall, so every read path builds its filter from
 * `prayerWallWhere` and nothing constructs its own.
 */

export type Viewer = {
  id?: string
  role?: Role
  /** Prayer groups the viewer belongs to. Empty for guests. */
  groupIds?: string[]
}

/** Statuses that belong on a wall at all. FLAGGED and ARCHIVED never do. */
const visibleStatuses: PrayerStatus[] = [PrayerStatus.ACTIVE, PrayerStatus.ANSWERED]

export function prayerWallWhere(viewer: Viewer): Prisma.PrayerRequestWhereInput {
  // Prayer team, pastors and admins see everything, including PRIVATE.
  if (canModeratePrayer(viewer.role)) return {}

  // Signed out: strictly public, non-group, active requests.
  if (!viewer.id) {
    return {
      visibility: PrayerVisibility.PUBLIC,
      status: { in: visibleStatuses },
      groupId: null,
    }
  }

  const groupIds = viewer.groupIds ?? []

  return {
    OR: [
      // Your own requests are always yours to see, whatever their state.
      { authorId: viewer.id },
      {
        AND: [
          { visibility: { in: [PrayerVisibility.PUBLIC, PrayerVisibility.MEMBERS_ONLY] } },
          { status: { in: visibleStatuses } },
          // Group-scoped requests only reach that group's members.
          { OR: [{ groupId: null }, ...(groupIds.length ? [{ groupId: { in: groupIds } }] : [])] },
        ],
      },
    ],
  }
}

/** Single-record check, matching the rules above. Used before showing a detail view. */
export function canViewRequest(
  request: {
    authorId: string | null
    visibility: PrayerVisibility
    status: PrayerStatus
    groupId: string | null
  },
  viewer: Viewer,
) {
  if (canModeratePrayer(viewer.role)) return true
  if (viewer.id && request.authorId === viewer.id) return true
  if (!visibleStatuses.includes(request.status)) return false
  if (request.visibility === PrayerVisibility.PRIVATE) return false
  if (request.visibility === PrayerVisibility.MEMBERS_ONLY && !viewer.id) return false
  if (request.groupId && !(viewer.groupIds ?? []).includes(request.groupId)) return false
  return true
}

/** Resolves the viewer's prayer-group memberships for the filter above. */
export async function loadViewer(user: { id: string; role: Role } | null): Promise<Viewer> {
  if (!user) return {}
  if (!prisma) return { id: user.id, role: user.role, groupIds: [] }

  try {
    const memberships = await prisma.prayerGroupMember.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    })
    return { id: user.id, role: user.role, groupIds: memberships.map((row) => row.groupId) }
  } catch {
    return { id: user.id, role: user.role, groupIds: [] }
  }
}

/**
 * The name to print on a card.
 *
 * Anonymity is applied at render time *and* the underlying author id is never
 * sent to the browser for an anonymous request — see `toWallCard` below.
 */
export function displayAuthor(request: {
  anonymous: boolean
  author: { name: string } | null
  guestName: string | null
}) {
  if (request.anonymous) return 'Anonymous'
  if (request.author) return request.author.name
  if (request.guestName) return `${request.guestName} (guest)`
  return 'A friend'
}

export const prayerCardSelect = {
  id: true,
  title: true,
  content: true,
  category: true,
  urgency: true,
  visibility: true,
  anonymous: true,
  status: true,
  verse: true,
  prayerCount: true,
  answeredAt: true,
  answerNote: true,
  createdAt: true,
  authorId: true,
  guestName: true,
  groupId: true,
  flagged: true,
  needsPastoralFollowUp: true,
  author: { select: { name: true, image: true } },
  _count: { select: { responses: true } },
} satisfies Prisma.PrayerRequestSelect

export type PrayerRecord = Prisma.PrayerRequestGetPayload<{ select: typeof prayerCardSelect }>

export type WallCard = {
  id: string
  title: string
  content: string
  category: PrayerCategory
  urgency: PrayerUrgency
  status: PrayerStatus
  authorName: string
  authorImage: string | null
  verse: string | null
  prayerCount: number
  responseCount: number
  answerNote: string | null
  createdAt: string
  isMine: boolean
  /** True when the viewer has already logged a prayer for it. */
  hasPrayed: boolean
}

/**
 * Shapes a record for the browser.
 *
 * Anonymous requests lose their author id and avatar here, not in the
 * component — so no future template can accidentally render them.
 */
export function toWallCard(
  record: PrayerRecord,
  options: { viewerId?: string; prayedIds: Set<string> },
): WallCard {
  const anonymous = record.anonymous

  return {
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    urgency: record.urgency,
    status: record.status,
    authorName: displayAuthor(record),
    authorImage: anonymous ? null : (record.author?.image ?? null),
    verse: record.verse,
    prayerCount: record.prayerCount,
    responseCount: record._count.responses,
    answerNote: record.answerNote,
    createdAt: record.createdAt.toISOString(),
    isMine: Boolean(options.viewerId && record.authorId === options.viewerId),
    hasPrayed: options.prayedIds.has(record.id),
  }
}

/**
 * Which of these requests has this actor already prayed for?
 *
 * `actorKey` is null for a guest whose cookie has not been minted yet — they
 * cannot have prayed for anything, so the empty set is the right answer.
 */
export async function loadPrayedIds(actorKey: string | null, requestIds: string[]) {
  if (!prisma || !actorKey || requestIds.length === 0) return new Set<string>()

  try {
    const logs = await prisma.prayerLog.findMany({
      where: { actorKey, requestId: { in: requestIds } },
      select: { requestId: true },
    })
    return new Set(logs.map((log) => log.requestId))
  } catch {
    return new Set<string>()
  }
}

export const categoryLabels: Record<PrayerCategory, string> = {
  SALVATION: 'Salvation',
  HEALING: 'Healing',
  FINANCES: 'Finances',
  FAMILY: 'Family',
  RELATIONSHIPS: 'Relationships',
  GUIDANCE: 'Guidance',
  THANKSGIVING: 'Thanksgiving',
  GENERAL: 'General',
}

export const categoryEmoji: Record<PrayerCategory, string> = {
  SALVATION: '❤️',
  HEALING: '🩹',
  FINANCES: '🌾',
  FAMILY: '👨‍👩‍👧',
  RELATIONSHIPS: '🤝',
  GUIDANCE: '🧭',
  THANKSGIVING: '🎉',
  GENERAL: '🙏',
}

export const urgencyLabels: Record<PrayerUrgency, string> = {
  LOW: 'Whenever you can',
  NORMAL: 'Normal',
  HIGH: 'Urgent',
  URGENT: 'Very urgent',
}

export const visibilityLabels: Record<PrayerVisibility, string> = {
  PUBLIC: 'Anyone can see this',
  MEMBERS_ONLY: 'Only church members',
  PRIVATE: 'Only the prayer team',
}
