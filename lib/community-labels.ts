import type {
  CareKind,
  CareStatus,
  GroupKind,
  HelpCategory,
  HelpKind,
  HelpStatus,
  InitiativeKind,
} from '@prisma/client'

/**
 * Wording and small pure helpers for the community features.
 *
 * Split out of `lib/initiatives.ts` because that module is `server-only` — it
 * holds the query shapes and touches the database. The composer, the help
 * board and the care form all run in the browser and need these labels, and
 * importing the server module into a client bundle fails the build.
 *
 * Every Prisma import here is a type, so it vanishes at compile time.
 */

// --- Initiatives -----------------------------------------------------------

export const initiativeLabels: Record<InitiativeKind, string> = {
  READING_PLAN: 'Reading plan',
  FAST: 'Fast',
  CHALLENGE: 'Challenge',
}

export const initiativeEmoji: Record<InitiativeKind, string> = {
  READING_PLAN: '📖',
  FAST: '🔥',
  CHALLENGE: '🎯',
}

/** The verb each kind uses, so the buttons read naturally. */
export const initiativeVerbs: Record<
  InitiativeKind,
  { join: string; joined: string; log: string }
> = {
  READING_PLAN: { join: 'Join this plan', joined: 'You are reading along', log: 'Mark today read' },
  FAST: { join: 'Join this fast', joined: 'You are fasting with us', log: 'Log today' },
  CHALLENGE: { join: 'Take the challenge', joined: 'You are taking part', log: 'Log today' },
}

export type InitiativeStatus = 'upcoming' | 'running' | 'finished'

export function initiativeStatus(
  initiative: { startsOn: Date; endsOn: Date },
  now = new Date(),
): InitiativeStatus {
  if (now < initiative.startsOn) return 'upcoming'
  if (now > initiative.endsOn) return 'finished'
  return 'running'
}

export function totalDays(initiative: { startsOn: Date; endsOn: Date }) {
  return Math.max(
    1,
    Math.round((initiative.endsOn.getTime() - initiative.startsOn.getTime()) / 86_400_000) + 1,
  )
}

/** Whole days from the start, 1-indexed. Clamped to the initiative's length. */
export function currentDayNumber(initiative: { startsOn: Date; endsOn: Date }, now = new Date()) {
  const total = totalDays(initiative)
  const elapsed = Math.floor((now.getTime() - initiative.startsOn.getTime()) / 86_400_000) + 1
  return Math.min(Math.max(elapsed, 1), total)
}

export function formatRange(from: Date, to: Date) {
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })
  const full = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return from.getFullYear() === to.getFullYear()
    ? `${day.format(from)} – ${full.format(to)}`
    : `${full.format(from)} – ${full.format(to)}`
}

/** Midnight local, so "today" means the whole day rather than this instant. */
export function startOfDay(date = new Date()) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

// --- Help board ------------------------------------------------------------

export const helpCategoryLabels: Record<HelpCategory, string> = {
  TRANSPORT: 'Lifts & transport',
  MOVING: 'Moving & lifting',
  MEALS: 'Meals',
  CHILDCARE: 'Childcare',
  REPAIRS: 'Repairs & DIY',
  TECH: 'Tech help',
  TUTORING: 'Tutoring',
  ADMIN: 'Forms & admin',
  CLEANING: 'Cleaning',
  OTHER: 'Something else',
}

export const helpCategoryEmoji: Record<HelpCategory, string> = {
  TRANSPORT: '🚗',
  MOVING: '📦',
  MEALS: '🍲',
  CHILDCARE: '🧸',
  REPAIRS: '🔧',
  TECH: '💻',
  TUTORING: '✏️',
  ADMIN: '📋',
  CLEANING: '🧹',
  OTHER: '🤲',
}

export const helpKindLabels: Record<HelpKind, string> = {
  REQUEST: 'Needs a hand',
  OFFER: 'Offering help',
}

export const helpStatusLabels: Record<HelpStatus, string> = {
  OPEN: 'Open',
  CLAIMED: 'Someone stepped up',
  DONE: 'Done',
  CANCELLED: 'Withdrawn',
}

// --- Pastoral care ---------------------------------------------------------

export const careKindLabels: Record<CareKind, string> = {
  QUESTION: 'A question for an elder',
  BENEVOLENCE: 'Help with a practical need',
  PASTORAL_VISIT: 'A visit or a call',
}

export const careKindHints: Record<CareKind, string> = {
  QUESTION: 'Anything about faith, the Bible, or this church. No question is too small.',
  BENEVOLENCE:
    'Food, bills, clothing, rent. Read only by the pastors — never shown to the church, and never on the feed.',
  PASTORAL_VISIT: 'Somebody will get in touch to arrange a time.',
}

export const careStatusLabels: Record<CareStatus, string> = {
  OPEN: 'Waiting',
  IN_PROGRESS: 'Being looked at',
  ANSWERED: 'Answered',
  CLOSED: 'Closed',
}

// --- Groups ----------------------------------------------------------------

export const groupKindLabels: Record<GroupKind, string> = {
  SMALL_GROUP: 'Small group',
  NEIGHBOURHOOD: 'Neighbourhood',
  INTEREST: 'Interest group',
  SERVICE_TIME: 'Service',
  SUPPORT: 'Support group',
  LEADERSHIP: 'Leadership',
}

export const groupKindEmoji: Record<GroupKind, string> = {
  SMALL_GROUP: '🏠',
  NEIGHBOURHOOD: '📍',
  INTEREST: '⚽',
  SERVICE_TIME: '⛪',
  SUPPORT: '🫂',
  LEADERSHIP: '🔑',
}

export const groupKindHints: Record<GroupKind, string> = {
  SMALL_GROUP: 'Midweek homes and Bible study.',
  NEIGHBOURHOOD: 'People near you — for lifts, prayer and local outreach.',
  INTEREST: 'Football, music, books, whatever you love.',
  SERVICE_TIME: 'Everyone who comes to the same service.',
  SUPPORT: 'A safe, private place for a hard season. Invite only.',
  LEADERSHIP: 'Elders, deacons and ministry leaders.',
}
