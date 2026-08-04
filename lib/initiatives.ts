import 'server-only'

import {
  Prisma,
  InitiativeKind,
  type CareKind,
  type CareStatus,
  type GroupKind,
  type HelpCategory,
  type HelpKind,
  type HelpStatus,
  type Role,
} from '@prisma/client'

import {
  formatRange,
  initiativeEmoji,
  initiativeLabels,
  initiativeStatus,
  totalDays,
  type InitiativeStatus,
} from '@/lib/community-labels'
import { prisma } from '@/lib/prisma'

/**
 * Reading plans, corporate fasts and weekly challenges — query shapes and the
 * rules about who may see what.
 *
 * All three are one `Initiative` with a different `kind`: they are the same
 * shape (a window of days that members join and log against), and giving each
 * its own table would have meant three sign-up flows, three progress tables and
 * three copies of every bug.
 *
 * The wording lives in `lib/community-labels.ts` instead, because this module
 * is `server-only` and the composer, help board and care form all render in the
 * browser. Re-exported below so server callers still need one import.
 */
export * from '@/lib/community-labels'

export const initiativeCardSelect = {
  id: true,
  slug: true,
  kind: true,
  title: true,
  description: true,
  startsOn: true,
  endsOn: true,
  isActive: true,
  isFeatured: true,
  _count: { select: { members: true, days: true } },
} satisfies Prisma.InitiativeSelect

export type InitiativeRecord = Prisma.InitiativeGetPayload<{
  select: typeof initiativeCardSelect
}>

export type InitiativeCard = {
  slug: string
  kind: InitiativeKind
  kindLabel: string
  emoji: string
  title: string
  description: string | null
  startsOn: string
  endsOn: string
  dateRange: string
  status: InitiativeStatus
  memberCount: number
  totalDays: number
  isFeatured: boolean
}

export function toInitiativeCard(record: InitiativeRecord): InitiativeCard {
  return {
    slug: record.slug,
    kind: record.kind,
    kindLabel: initiativeLabels[record.kind],
    emoji: initiativeEmoji[record.kind],
    title: record.title,
    description: record.description,
    startsOn: record.startsOn.toISOString(),
    endsOn: record.endsOn.toISOString(),
    dateRange: formatRange(record.startsOn, record.endsOn),
    status: initiativeStatus(record),
    memberCount: record._count.members,
    totalDays: totalDays(record),
    isFeatured: record.isFeatured,
  }
}

/**
 * How far a member has got.
 *
 * Counts logged days rather than trusting a stored streak — a counter that can
 * drift is worse than a query, and this runs on one indexed table.
 */
export async function progressFor(initiativeId: string, userId: string) {
  if (!prisma) return { joined: false, logged: 0, loggedDays: new Set<number>() }

  try {
    const [membership, logs] = await Promise.all([
      prisma.initiativeMember.findUnique({
        where: { initiativeId_userId: { initiativeId, userId } },
        select: { id: true, completedAt: true, intent: true },
      }),
      prisma.initiativeLog.findMany({
        where: { initiativeId, userId },
        select: { dayNumber: true },
      }),
    ])

    return {
      joined: Boolean(membership),
      completedAt: membership?.completedAt ?? null,
      intent: membership?.intent ?? null,
      logged: logs.length,
      loggedDays: new Set(logs.map((log) => log.dayNumber)),
    }
  } catch {
    return { joined: false, logged: 0, loggedDays: new Set<number>() }
  }
}

// ---------------------------------------------------------------------------
// Help board
// ---------------------------------------------------------------------------

/**
 * The help board is members-only, full stop.
 *
 * "I am away next week and need someone to feed the cat" is not something to
 * publish to the open internet, so there is no guest read path at all.
 */
export function helpBoardWhere(filters: {
  kind?: HelpKind
  category?: HelpCategory
  area?: string
  mine?: string
  includeClosed?: boolean
}): Prisma.HelpPostWhereInput {
  const clauses: Prisma.HelpPostWhereInput[] = []

  if (!filters.includeClosed) clauses.push({ status: { in: ['OPEN', 'CLAIMED'] } })
  if (filters.kind) clauses.push({ kind: filters.kind })
  if (filters.category) clauses.push({ category: filters.category })
  if (filters.area) clauses.push({ area: { equals: filters.area, mode: 'insensitive' } })
  if (filters.mine) {
    clauses.push({ OR: [{ authorId: filters.mine }, { claimedById: filters.mine }] })
  }

  return clauses.length > 0 ? { AND: clauses } : {}
}

// ---------------------------------------------------------------------------
// Pastoral care
// ---------------------------------------------------------------------------

/**
 * Who may read care requests.
 *
 * Benevolence requests are the most sensitive rows in the platform — somebody
 * has written down that they cannot pay rent. Deliberately narrower than
 * `canModerateCommunity`: a small-group leader moderates posts, but does not
 * get to read who in their group asked for food.
 */
export function canReadCare(role: Role | undefined) {
  return role === 'ADMIN' || role === 'PASTOR'
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/** Kinds anybody may browse and ask to join. */
export const openGroupKinds: GroupKind[] = [
  'SMALL_GROUP',
  'NEIGHBOURHOOD',
  'INTEREST',
  'SERVICE_TIME',
]

/**
 * Which groups a person may even see listed.
 *
 * Support and leadership groups are invisible to non-members — not merely
 * un-joinable. Seeing "Grief & Loss — 6 members" in a list is itself a leak
 * about the six.
 */
export function groupListWhere(viewer: {
  id?: string
  role?: Role
  groupIds: string[]
}): Prisma.SmallGroupWhereInput {
  const isLeader = viewer.role === 'ADMIN' || viewer.role === 'PASTOR'
  if (isLeader) return { isActive: true }

  return {
    isActive: true,
    OR: [
      { inviteOnly: false, isPublic: true },
      ...(viewer.groupIds.length > 0 ? [{ id: { in: viewer.groupIds } }] : []),
    ],
  }
}
