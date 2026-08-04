import 'server-only'

import { Prisma, type MemberProfile, type Role } from '@prisma/client'

import { canModerateCommunityFeed } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

/**
 * Member profiles, the directory, and who is allowed to see which parts.
 *
 * The rule that governs everything here: **a member's contact details are
 * theirs to give out, not the platform's.** Email, phone, birthday and
 * neighbourhood are each behind their own opt-in flag, they default to hidden,
 * and `redactProfile` is the only thing that assembles a profile for display —
 * so a field cannot leak by a template forgetting to check.
 */

/** Suggested tags. Free text is still allowed; these just seed the pickers. */
export const spiritualGifts = [
  'teaching',
  'serving',
  'mercy',
  'giving',
  'leadership',
  'encouragement',
  'hospitality',
  'intercession',
  'evangelism',
  'administration',
  'prophecy',
  'helps',
  'discernment',
  'faith',
  'worship',
  'pastoring',
] as const

export const interestTags = [
  'music',
  'sports',
  'football',
  'cooking',
  'reading',
  'gardening',
  'art',
  'photography',
  'writing',
  'technology',
  'travel',
  'youth work',
  'children',
  'outreach',
] as const

export const skillTags = [
  'carpentry',
  'plumbing',
  'electrical',
  'mechanics',
  'cooking',
  'tutoring',
  'counselling',
  'IT support',
  'design',
  'accounting',
  'legal',
  'medical',
  'driving',
  'childcare',
  'translation',
] as const

export type DirectoryFilters = {
  q?: string
  gift?: string
  interest?: string
  skill?: string
  neighbourhood?: string
  ministry?: string
  mentors?: boolean
}

/**
 * Who appears in the directory.
 *
 * Only signed-in members ever reach it — there is no guest path — and anyone
 * who unticked "list me" is excluded before any filter runs. Banned accounts
 * never appear.
 */
export function directoryWhere(filters: DirectoryFilters): Prisma.UserWhereInput {
  const clauses: Prisma.UserWhereInput[] = [
    { bannedAt: null },
    { profile: { is: { listed: true } } },
  ]

  const q = filters.q?.trim()
  if (q) {
    clauses.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { profile: { is: { headline: { contains: q, mode: 'insensitive' } } } },
        { profile: { is: { bio: { contains: q, mode: 'insensitive' } } } },
        { profile: { is: { spiritualGifts: { has: q.toLowerCase() } } } },
        { profile: { is: { interests: { has: q.toLowerCase() } } } },
        { profile: { is: { skills: { has: q.toLowerCase() } } } },
      ],
    })
  }

  if (filters.gift) {
    clauses.push({ profile: { is: { spiritualGifts: { has: filters.gift.toLowerCase() } } } })
  }
  if (filters.interest) {
    clauses.push({ profile: { is: { interests: { has: filters.interest.toLowerCase() } } } })
  }
  if (filters.skill) {
    clauses.push({ profile: { is: { skills: { has: filters.skill.toLowerCase() } } } })
  }
  if (filters.neighbourhood) {
    clauses.push({
      profile: {
        is: {
          neighbourhood: { equals: filters.neighbourhood, mode: 'insensitive' },
          // Never surface a neighbourhood the member chose to keep to themselves.
          showNeighbourhood: true,
        },
      },
    })
  }
  if (filters.ministry) {
    clauses.push({ ministries: { some: { ministry: { slug: filters.ministry } } } })
  }
  if (filters.mentors) {
    clauses.push({ profile: { is: { mentorAvailable: true } } })
  }

  return { AND: clauses }
}

export const directorySelect = {
  id: true,
  name: true,
  image: true,
  email: true,
  role: true,
  birthDate: true,
  profile: true,
  // The ids come along so `suggestPeople` can score overlap without a second
  // query per candidate.
  ministries: {
    select: { ministryId: true, ministry: { select: { name: true, slug: true } } },
  },
  smallGroups: {
    select: { groupId: true, group: { select: { name: true, slug: true, kind: true } } },
  },
} satisfies Prisma.UserSelect

export type DirectoryRecord = Prisma.UserGetPayload<{ select: typeof directorySelect }>

export type PublicProfile = {
  id: string
  name: string
  image: string | null
  role: Role
  headline: string | null
  bio: string | null
  neighbourhood: string | null
  /** The member photograph, through the authenticated route. */
  avatar: string | null
  /** Null unless the member chose to show it. */
  email: string | null
  phone: string | null
  address: string | null
  profession: string | null
  /** "14 March" — the year is never shown, even when the birthday is. */
  birthday: string | null
  spiritualGifts: string[]
  interests: string[]
  skills: string[]
  mentorAvailable: boolean
  seekingMentor: boolean
  ministries: { name: string; slug: string }[]
  groups: { name: string; slug: string }[]
  isMe: boolean
}

/**
 * Assembles a profile for display, applying every privacy flag.
 *
 * The single place a `MemberProfile` becomes something renderable. Hidden
 * fields are returned as null rather than omitted, so a component that renders
 * them unconditionally still shows nothing.
 *
 * Leaders do **not** get to bypass this. A member who hid their phone number
 * hid it from the church, not from strangers — pastors who need it have the
 * admin area.
 */
export function redactProfile(record: DirectoryRecord, viewerId?: string): PublicProfile {
  const profile = record.profile
  const isMe = Boolean(viewerId && record.id === viewerId)
  const show = (flag: boolean | undefined) => isMe || Boolean(flag)

  return {
    id: record.id,
    name: record.name,
    image: record.image,
    role: record.role,
    headline: profile?.headline ?? null,
    bio: profile?.bio ?? null,
    neighbourhood: show(profile?.showNeighbourhood) ? (profile?.neighbourhood ?? null) : null,
    avatar: profile?.avatarKey ? `/api/members/${record.id}/avatar` : record.image,
    address: show(profile?.showAddress) ? (profile?.address ?? null) : null,
    profession: show(profile?.showProfession) ? (profile?.profession ?? null) : null,
    email: show(profile?.showEmail) ? record.email : null,
    phone: show(profile?.showPhone) ? (profile?.phone ?? null) : null,
    birthday:
      show(profile?.showBirthday) && record.birthDate ? formatBirthday(record.birthDate) : null,
    spiritualGifts: profile?.spiritualGifts ?? [],
    interests: profile?.interests ?? [],
    skills: profile?.skills ?? [],
    mentorAvailable: profile?.mentorAvailable ?? false,
    seekingMentor: profile?.seekingMentor ?? false,
    ministries: record.ministries.map((row) => row.ministry),
    // Support and leadership groups are private by nature and never listed on
    // a profile — that a member is in the grief group is not public knowledge.
    groups: record.smallGroups
      .filter((row) => row.group.kind !== 'SUPPORT' && row.group.kind !== 'LEADERSHIP')
      .map((row) => ({ name: row.group.name, slug: row.group.slug })),
    isMe,
  }
}

/** Day and month only. Nobody's age is anybody's business. */
export function formatBirthday(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(date)
}

/**
 * People you may know.
 *
 * Ranked by shared context — same ministry, same small group, same
 * neighbourhood — because those are the people you would actually recognise on
 * a Sunday. Deliberately not "friends of friends": there is no friend graph
 * here, and inventing one would turn a church directory into a social network.
 */
export async function suggestPeople(userId: string, take = 6) {
  if (!prisma) return []

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        ministries: { select: { ministryId: true } },
        smallGroups: { select: { groupId: true } },
        profile: { select: { neighbourhood: true, interests: true } },
      },
    })
    if (!me) return []

    const ministryIds = me.ministries.map((row) => row.ministryId)
    const groupIds = me.smallGroups.map((row) => row.groupId)
    const neighbourhood = me.profile?.neighbourhood ?? null
    const interests = me.profile?.interests ?? []

    // Already-connected people are the ones you know; exclude them and yourself.
    const blocked = await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    })
    const excluded = new Set<string>([userId])
    for (const row of blocked) {
      excluded.add(row.blockerId)
      excluded.add(row.blockedId)
    }

    const candidates = await prisma.user.findMany({
      where: {
        AND: [
          { id: { notIn: [...excluded] } },
          { bannedAt: null },
          { profile: { is: { listed: true } } },
          {
            OR: [
              ...(ministryIds.length ? [{ ministries: { some: { ministryId: { in: ministryIds } } } }] : []),
              ...(groupIds.length ? [{ smallGroups: { some: { groupId: { in: groupIds } } } }] : []),
              ...(neighbourhood
                ? [{ profile: { is: { neighbourhood, showNeighbourhood: true } } }]
                : []),
              ...(interests.length ? [{ profile: { is: { interests: { hasSome: interests } } } }] : []),
            ],
          },
        ],
      },
      select: directorySelect,
      take: 40,
    })

    /*
     * Each overlap is recomputed here rather than inferred from the query. The
     * OR above only proves that *one* of the clauses matched — it cannot say
     * which, and the reason shown to the member has to be the true one.
     */
    const mine = { ministries: new Set(ministryIds), groups: new Set(groupIds) }

    const scored = candidates.map((candidate) => {
      let score = 0
      const reasons: string[] = []

      const sharedMinistries = candidate.ministries.filter((row) =>
        mine.ministries.has(row.ministryId),
      )
      if (sharedMinistries.length > 0) {
        score += sharedMinistries.length * 3
        reasons.push(`Serves in ${sharedMinistries[0]!.ministry.name}`)
      }

      // Support and leadership groups never explain a suggestion — that would
      // tell the viewer who else is in the grief group.
      const sharedGroups = candidate.smallGroups.filter(
        (row) =>
          mine.groups.has(row.groupId) &&
          row.group.kind !== 'SUPPORT' &&
          row.group.kind !== 'LEADERSHIP',
      )
      if (sharedGroups.length > 0) {
        score += sharedGroups.length * 3
        reasons.push(`In ${sharedGroups[0]!.group.name} with you`)
      }

      if (neighbourhood && candidate.profile?.neighbourhood === neighbourhood) {
        score += 2
        reasons.push(`Lives in ${neighbourhood}`)
      }

      const sharedInterests = (candidate.profile?.interests ?? []).filter((tag) =>
        interests.includes(tag),
      )
      if (sharedInterests.length > 0) {
        score += sharedInterests.length
        reasons.push(`Also into ${sharedInterests.slice(0, 2).join(' and ')}`)
      }

      return { candidate, score, reasons }
    })

    return scored
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
      .map(({ candidate, reasons }) => ({
        profile: redactProfile(candidate, userId),
        reasons,
      }))
  } catch (error) {
    console.error('[suggest people]', error)
    return []
  }
}

/** Ensures a profile row exists, so the editor always has something to edit. */
export async function ensureProfile(userId: string): Promise<MemberProfile | null> {
  if (!prisma) return null
  try {
    return await prisma.memberProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    })
  } catch {
    return null
  }
}

/**
 * Records that someone is still around.
 *
 * Fire-and-forget: a failed touch must never break the page that triggered it,
 * and being a few minutes stale costs nothing — this only feeds the "quiet for
 * a month" check.
 */
export async function touchActivity(userId: string | undefined) {
  if (!prisma || !userId) return
  try {
    await prisma.memberProfile.upsert({
      where: { userId },
      update: { lastActiveAt: new Date() },
      create: { userId },
    })
  } catch {
    // Deliberately silent.
  }
}

/** Is this member currently muted? */
export function isSnoozed(profile: { dndUntil: Date | null } | null | undefined, now = new Date()) {
  return Boolean(profile?.dndUntil && profile.dndUntil > now)
}

/** Whose birthday falls in the next `days` days — opted in only. */
export async function upcomingBirthdays(days = 14) {
  if (!prisma) return []

  try {
    const people = await prisma.user.findMany({
      where: {
        bannedAt: null,
        birthDate: { not: null },
        profile: { is: { listed: true, showBirthday: true } },
      },
      select: { id: true, name: true, image: true, birthDate: true },
      take: 500,
    })

    const now = new Date()
    const soon: { id: string; name: string; image: string | null; label: string; inDays: number }[] =
      []

    for (const person of people) {
      if (!person.birthDate) continue

      // Compare month/day only — this year's occurrence, or next year's if it
      // has already gone past.
      const next = new Date(
        now.getFullYear(),
        person.birthDate.getMonth(),
        person.birthDate.getDate(),
      )
      if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        next.setFullYear(now.getFullYear() + 1)
      }

      const inDays = Math.round((next.getTime() - now.setHours(0, 0, 0, 0)) / 86_400_000)
      if (inDays >= 0 && inDays <= days) {
        soon.push({
          id: person.id,
          name: person.name,
          image: person.image,
          label: formatBirthday(person.birthDate),
          inDays,
        })
      }
    }

    return soon.sort((a, b) => a.inDays - b.inDays)
  } catch (error) {
    console.error('[birthdays]', error)
    return []
  }
}

/** Members who have not been seen in a while, for a gentle check-in. */
export async function quietMembers(sinceDays = 30, take = 50) {
  if (!prisma) return []

  const cutoff = new Date(Date.now() - sinceDays * 86_400_000)
  try {
    return await prisma.user.findMany({
      where: {
        bannedAt: null,
        OR: [{ profile: { is: { lastActiveAt: { lt: cutoff } } } }, { profile: { is: null } }],
        createdAt: { lt: cutoff },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        profile: { select: { lastActiveAt: true } },
        smallGroups: { select: { group: { select: { name: true, leaderId: true } } } },
      },
      orderBy: { createdAt: 'asc' },
      take,
    })
  } catch (error) {
    console.error('[quiet members]', error)
    return []
  }
}

/** Leaders can see who moderates. Everyone else sees the badge only. */
export function canManageDirectory(role: Role | undefined) {
  return canModerateCommunityFeed(role)
}
