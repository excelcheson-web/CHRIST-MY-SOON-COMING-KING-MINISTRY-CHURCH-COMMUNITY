import 'server-only'

import type { AnnouncementAudience, Prisma } from '@prisma/client'

import { bundledPastorsWords } from '@/content/pastors-words'
import { calendarArt } from '@/lib/calendar-art'
import { churchYear, startOfDay, type ChurchDate, type ChurchDateKey } from '@/lib/church-year'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'

/**
 * Everything the home page needs from the database: the church calendar, the
 * announcement boards, the pastor's word, and today's birthdays.
 *
 * All four follow the same rule as the rest of this codebase — **the page never
 * breaks because the database is having a bad minute.** Each loader catches its
 * own error and returns something sensible, and the calendar and the pastor's
 * word are computed from bundled data in the first place, so they are correct
 * even with no database at all.
 */

// ---------------------------------------------------------------------------
// The pastor's word
// ---------------------------------------------------------------------------

export type PastorsWordView = {
  title: string
  body: string
  reference: string | null
  author: string | null
  /** True when a pastor wrote this one rather than it coming from rotation. */
  written: boolean
  date: Date
}

/**
 * Days since a fixed epoch, used to pick today's bundled word.
 *
 * Deterministic on purpose: everybody sees the same word all day, it changes at
 * midnight, and it does not jump about when the server restarts — which a
 * random pick would.
 */
function dayIndex(date: Date) {
  return Math.floor(startOfDay(date).getTime() / 86_400_000)
}

export function bundledWordFor(date = new Date()): PastorsWordView {
  const pool = bundledPastorsWords
  const chosen = pool[dayIndex(date) % pool.length]!

  return {
    title: chosen.title,
    body: chosen.body,
    reference: chosen.reference ?? null,
    author: null,
    written: false,
    date: startOfDay(date),
  }
}

/**
 * Today's word: whatever a pastor scheduled, else the rotation.
 *
 * Never returns null. That is the whole design — the section cannot be empty,
 * so nobody has to write one every morning to keep the home page looking alive.
 */
export async function pastorsWordToday(date = new Date()): Promise<PastorsWordView> {
  const fallback = bundledWordFor(date)
  if (!prisma) return fallback

  try {
    const row = await prisma.pastorsWord.findUnique({ where: { showOn: startOfDay(date) } })
    if (!row) return fallback

    return {
      title: row.title,
      body: row.body,
      reference: row.reference,
      author: row.author,
      written: true,
      date: row.showOn,
    }
  } catch (error) {
    console.error('[pastors word]', error)
    return fallback
  }
}

// ---------------------------------------------------------------------------
// The church calendar
// ---------------------------------------------------------------------------

export type CalendarEntry = ChurchDate & {
  /** Large artwork for the feature card. */
  image: string | null
  /** Small artwork for the list tiles. Falls back to `image`. */
  thumb: string | null
  /** What the picture shows, for the rare placement where it carries meaning. */
  imageAlt: string
  /** True when an administrator has overridden the bundled wording. */
  customised: boolean
}

/**
 * Which picture goes with an entry: the church's own if it uploaded one, else
 * the bundled photograph for that day.
 *
 * A church upload has one size, so the thumbnail is the same file — the tile
 * is 56px square and the browser can scale a large image down perfectly well.
 * Only the bundled set is worth shipping twice.
 */
function pictureFor(
  key: ChurchDateKey,
  row?: { id: string; image: string | null; imageKey: string | null } | null,
) {
  const uploaded = row?.image ?? (row?.imageKey ? `/api/calendar/${row.id}/image` : null)
  if (uploaded) return { image: uploaded, thumb: uploaded, imageAlt: '' }

  const bundled = calendarArt[key]
  if (!bundled) return { image: null, thumb: null, imageAlt: '' }
  return { image: bundled.lg, thumb: bundled.sm, imageAlt: bundled.alt }
}

/**
 * The next few observances, with any church-supplied wording and artwork
 * merged over the computed dates.
 *
 * The *date* always comes from `lib/church-year.ts` — an administrator can
 * change what a feast is called and what picture sits beside it, but not when
 * Easter is, because that is arithmetic rather than opinion.
 */
export async function upcomingChurchDates(take = 4, from = new Date()): Promise<CalendarEntry[]> {
  const computed = churchYear(from)

  if (!prisma) {
    return computed
      .slice(0, take)
      .map((entry) => ({ ...entry, ...pictureFor(entry.key), customised: false }))
  }

  try {
    const rows = await prisma.calendarDate.findMany({ where: { isActive: true } })
    const byKey = new Map(rows.map((row) => [row.key, row]))

    const merged: CalendarEntry[] = computed.map((entry) => {
      const row = byKey.get(entry.key)
      return {
        ...entry,
        title: row?.title || entry.title,
        description: row?.description || entry.description,
        ...pictureFor(entry.key, row),
        customised: Boolean(row),
      }
    })

    /*
     * One-off dates the church added itself — a convention, a crusade. They are
     * not part of the historic calendar, so they are merged in here rather than
     * living in `church-year.ts`.
     */
    const today = startOfDay(from)
    for (const row of rows) {
      if (!row.onceOn || row.onceOn < today) continue
      if (byKey.has(row.key) && computed.some((entry) => entry.key === row.key)) continue

      merged.push({
        key: row.key as ChurchDate['key'],
        title: row.title,
        description: row.description ?? '',
        date: row.onceOn,
        inDays: Math.round((startOfDay(row.onceOn).getTime() - today.getTime()) / 86_400_000),
        moveable: false,
        emoji: '📌',
        // A one-off has no bundled artwork by definition, so this is the
        // church's upload or nothing.
        ...pictureFor(row.key as ChurchDateKey, row),
        customised: true,
      })
    }

    // Anything the church switched off disappears entirely.
    const hidden = new Set(
      (await prisma.calendarDate.findMany({ where: { isActive: false }, select: { key: true } }))
        .map((row) => row.key),
    )

    return merged
      .filter((entry) => !hidden.has(entry.key))
      .sort((a, b) => a.inDays - b.inDays)
      .slice(0, take)
  } catch (error) {
    console.error('[church calendar]', error)
    return computed
      .slice(0, take)
      .map((entry) => ({ ...entry, ...pictureFor(entry.key), customised: false }))
  }
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export type AnnouncementView = {
  id: string
  title: string
  body: string
  image: string | null
  audience: AnnouncementAudience
  ministryName: string | null
  ministrySlug: string | null
  pinned: boolean
  startsAt: string
  endsAt: string | null
}

/**
 * Which announcements this person may read.
 *
 * A departmental announcement is for that department. Somebody who is not in
 * the media team does not need — and should not get — the media team's rota
 * changes, and a general board full of other people's notices is a board people
 * stop reading.
 */
export function announcementWhere(viewer: {
  id?: string
  ministryIds: string[]
  isLeader: boolean
}): Prisma.AnnouncementWhereInput {
  const now = new Date()
  const live: Prisma.AnnouncementWhereInput = {
    startsAt: { lte: now },
    OR: [{ endsAt: null }, { endsAt: { gte: now } }],
  }

  if (viewer.isLeader) return live
  if (!viewer.id) return { AND: [live, { audience: 'PUBLIC' }] }

  return {
    AND: [
      live,
      {
        OR: [
          { audience: 'PUBLIC' },
          { audience: 'MEMBERS' },
          ...(viewer.ministryIds.length > 0
            ? [{ audience: 'MINISTRY' as const, ministryId: { in: viewer.ministryIds } }]
            : []),
        ],
      },
    ],
  }
}

export async function loadAnnouncements(
  user: Session['user'] | null | undefined,
  take = 12,
): Promise<{ general: AnnouncementView[]; departmental: AnnouncementView[] }> {
  if (!prisma) return { general: [], departmental: [] }

  try {
    const ministryIds = user?.id
      ? (
          await prisma.ministryMember.findMany({
            where: { userId: user.id },
            select: { ministryId: true },
          })
        ).map((row) => row.ministryId)
      : []

    const isLeader =
      user?.role === 'ADMIN' || user?.role === 'PASTOR' || user?.role === 'LEADER'

    const rows = await prisma.announcement.findMany({
      where: announcementWhere({ id: user?.id, ministryIds, isLeader }),
      orderBy: [{ pinned: 'desc' }, { startsAt: 'desc' }],
      take,
      include: { ministry: { select: { name: true, slug: true } } },
    })

    const view = (row: (typeof rows)[number]): AnnouncementView => ({
      id: row.id,
      title: row.title,
      body: row.body,
      image: row.imageKey ? `/api/announcements/${row.id}/image` : null,
      audience: row.audience,
      ministryName: row.ministry?.name ?? null,
      ministrySlug: row.ministry?.slug ?? null,
      pinned: row.pinned,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
    })

    return {
      general: rows.filter((row) => !row.ministryId).map(view),
      departmental: rows.filter((row) => row.ministryId).map(view),
    }
  } catch (error) {
    console.error('[announcements]', error)
    return { general: [], departmental: [] }
  }
}

// ---------------------------------------------------------------------------
// Birthdays
// ---------------------------------------------------------------------------

export type BirthdayPerson = {
  id: string
  name: string
  avatar: string | null
  label: string
  inDays: number
}

/**
 * Whose birthday it is today, and whose is coming.
 *
 * Only members who ticked "show my birthday" — the celebration is a lovely
 * thing to be part of and a horrible thing to be dragged into, so it stays
 * opt-in. Signed-in viewers only, for the same reason the directory is.
 */
export async function birthdays(
  days = 14,
): Promise<{ today: BirthdayPerson[]; soon: BirthdayPerson[] }> {
  if (!prisma) return { today: [], soon: [] }

  try {
    const people = await prisma.user.findMany({
      where: {
        bannedAt: null,
        birthDate: { not: null },
        profile: { is: { listed: true, showBirthday: true } },
      },
      select: {
        id: true,
        name: true,
        image: true,
        birthDate: true,
        profile: { select: { avatarKey: true } },
      },
      take: 1000,
    })

    const now = startOfDay()
    const all: BirthdayPerson[] = []

    for (const person of people) {
      if (!person.birthDate) continue

      // Month and day only — this year's occurrence, or next year's if it has
      // already gone past.
      const next = new Date(now.getFullYear(), person.birthDate.getMonth(), person.birthDate.getDate())
      if (next < now) next.setFullYear(now.getFullYear() + 1)

      const inDays = Math.round((next.getTime() - now.getTime()) / 86_400_000)
      if (inDays > days) continue

      all.push({
        id: person.id,
        name: person.name,
        avatar: person.profile?.avatarKey ? `/api/members/${person.id}/avatar` : person.image,
        label: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(
          person.birthDate,
        ),
        inDays,
      })
    }

    all.sort((a, b) => a.inDays - b.inDays)
    return {
      today: all.filter((person) => person.inDays === 0),
      soon: all.filter((person) => person.inDays > 0),
    }
  } catch (error) {
    console.error('[birthdays]', error)
    return { today: [], soon: [] }
  }
}
