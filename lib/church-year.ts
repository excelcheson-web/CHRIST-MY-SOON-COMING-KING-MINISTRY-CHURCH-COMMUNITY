/**
 * The Christian year, computed rather than typed in.
 *
 * Half of the church calendar moves. Easter falls on the first Sunday after the
 * first full moon on or after the spring equinox, and eight other observances
 * hang off it — Ash Wednesday, Palm Sunday, Good Friday, Ascension, Pentecost
 * and the rest. A calendar that needs somebody to look those up every January
 * is a calendar that will be wrong by March.
 *
 * So this file works them out. An administrator can still override the wording
 * and the artwork for any of them (see `CalendarDate` and its `key`), but they
 * never have to get the date right.
 *
 * Client-safe: no database, no `server-only`, so the countdown can tick in the
 * browser as well as render on the server.
 */

export type ChurchDateKey =
  | 'new-year'
  | 'epiphany'
  | 'ash-wednesday'
  | 'palm-sunday'
  | 'maundy-thursday'
  | 'good-friday'
  | 'easter'
  | 'ascension'
  | 'pentecost'
  | 'trinity-sunday'
  | 'harvest'
  | 'advent'
  | 'christmas-eve'
  | 'christmas'
  | 'watch-night'

export type ChurchDate = {
  key: ChurchDateKey
  title: string
  description: string
  /** The actual date of its next occurrence. */
  date: Date
  /** Whole days from today. 0 means it is today. */
  inDays: number
  /** Moveable feasts are derived from Easter; fixed ones are not. */
  moveable: boolean
  emoji: string
}

/**
 * Easter Sunday, by the Anonymous Gregorian algorithm (Meeus/Jones/Butcher).
 *
 * Valid for any Gregorian year. Returns local midnight, so day arithmetic
 * elsewhere never has to think about time zones.
 */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(year, month - 1, day)
}

const DAY = 86_400_000

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

/** Midnight local, so "today" is a whole day rather than this instant. */
export function startOfDay(date = new Date()) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** The Sunday four weeks before Christmas — the start of Advent. */
function adventSunday(year: number) {
  const christmas = new Date(year, 11, 25)
  // Advent Sunday is the fourth Sunday before Christmas Day.
  const sundayBefore = addDays(christmas, -christmas.getDay())
  return addDays(sundayBefore, -21)
}

type Definition = {
  key: ChurchDateKey
  title: string
  description: string
  emoji: string
  moveable: boolean
  /** Given a year, when does it fall? */
  on: (year: number) => Date
}

/**
 * The observances, in the order the church year runs.
 *
 * Harvest has no universal date — many churches keep it on the Sunday nearest
 * the harvest moon, but plenty simply pick a Sunday in autumn. The first Sunday
 * of October is a common, defensible choice and an administrator can override
 * it like any other.
 */
const definitions: Definition[] = [
  {
    key: 'new-year',
    title: "New Year's Day",
    description: 'A new year, and new mercies with it.',
    emoji: '🎊',
    moveable: false,
    on: (year) => new Date(year, 0, 1),
  },
  {
    key: 'epiphany',
    title: 'Epiphany',
    description: 'The wise men find the King, and the light goes to the nations.',
    emoji: '⭐',
    moveable: false,
    on: (year) => new Date(year, 0, 6),
  },
  {
    key: 'ash-wednesday',
    title: 'Ash Wednesday',
    description: 'Lent begins — forty days of turning back to God.',
    emoji: '🕯️',
    moveable: true,
    on: (year) => addDays(easterSunday(year), -46),
  },
  {
    key: 'palm-sunday',
    title: 'Palm Sunday',
    description: 'The King rides in, and the crowd shouts Hosanna.',
    emoji: '🌿',
    moveable: true,
    on: (year) => addDays(easterSunday(year), -7),
  },
  {
    key: 'maundy-thursday',
    title: 'Maundy Thursday',
    description: 'The last supper, the towel and the basin.',
    emoji: '🍞',
    moveable: true,
    on: (year) => addDays(easterSunday(year), -3),
  },
  {
    key: 'good-friday',
    title: 'Good Friday',
    description: 'The cross. The day everything was paid for.',
    emoji: '✝️',
    moveable: true,
    on: (year) => addDays(easterSunday(year), -2),
  },
  {
    key: 'easter',
    title: 'Easter Sunday',
    description: 'He is risen. Everything this house believes rests on this day.',
    emoji: '🌅',
    moveable: true,
    on: easterSunday,
  },
  {
    key: 'ascension',
    title: 'Ascension Day',
    description: 'Forty days on, he returns to the Father — and tells us to wait.',
    emoji: '☁️',
    moveable: true,
    on: (year) => addDays(easterSunday(year), 39),
  },
  {
    key: 'pentecost',
    title: 'Pentecost',
    description: 'The Holy Ghost falls, and the church is born in fire.',
    emoji: '🔥',
    moveable: true,
    on: (year) => addDays(easterSunday(year), 49),
  },
  {
    key: 'trinity-sunday',
    title: 'Trinity Sunday',
    description: 'Father, Son and Holy Spirit — one God, worshipped not solved.',
    emoji: '🕊️',
    moveable: true,
    on: (year) => addDays(easterSunday(year), 56),
  },
  {
    key: 'harvest',
    title: 'Harvest Thanksgiving',
    description: 'We bring what we have been given, and we say thank you.',
    emoji: '🌾',
    moveable: true,
    // First Sunday of October.
    on: (year) => {
      const first = new Date(year, 9, 1)
      return addDays(first, (7 - first.getDay()) % 7)
    },
  },
  {
    key: 'advent',
    title: 'Advent Sunday',
    description: 'Four weeks of waiting well for the One who is coming.',
    emoji: '🕯️',
    moveable: true,
    on: adventSunday,
  },
  {
    key: 'christmas-eve',
    title: 'Christmas Eve',
    description: 'The night before the King arrived, quietly, in a feeding trough.',
    emoji: '🌟',
    moveable: false,
    on: (year) => new Date(year, 11, 24),
  },
  {
    key: 'christmas',
    title: 'Christmas Day',
    description: 'God with us. The promise kept in person.',
    emoji: '🎄',
    moveable: false,
    on: (year) => new Date(year, 11, 25),
  },
  {
    key: 'watch-night',
    title: 'Watch Night',
    description: 'We see the year out on our knees, and the new one in.',
    emoji: '🙏',
    moveable: false,
    on: (year) => new Date(year, 11, 31),
  },
]

/**
 * The next occurrence of every observance, soonest first.
 *
 * "Next" rolls into the following year automatically — on 30 December, Epiphany
 * is eight days away, not three hundred and fifty-seven.
 */
export function churchYear(from = new Date()): ChurchDate[] {
  const today = startOfDay(from)
  const year = today.getFullYear()

  return definitions
    .map((definition) => {
      let date = definition.on(year)
      if (date < today) date = definition.on(year + 1)

      return {
        key: definition.key,
        title: definition.title,
        description: definition.description,
        date,
        inDays: Math.round((date.getTime() - today.getTime()) / DAY),
        moveable: definition.moveable,
        emoji: definition.emoji,
      }
    })
    .sort((a, b) => a.inDays - b.inDays)
}

/** Anything falling today. Usually empty, occasionally the point of the page. */
export function todaysObservances(from = new Date()) {
  return churchYear(from).filter((entry) => entry.inDays === 0)
}

/** "Today" · "Tomorrow" · "in 12 days" · "in 3 months". */
export function countdownLabel(inDays: number) {
  if (inDays === 0) return 'Today'
  if (inDays === 1) return 'Tomorrow'
  if (inDays < 21) return `in ${inDays} days`
  if (inDays < 60) return `in ${Math.round(inDays / 7)} weeks`
  return `in ${Math.round(inDays / 30)} months`
}

export function formatChurchDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
