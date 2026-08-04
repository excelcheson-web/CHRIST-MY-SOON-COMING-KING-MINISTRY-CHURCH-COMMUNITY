import 'server-only'

import { randomBytes, randomInt } from 'node:crypto'
import {
  EventStatus,
  RegistrationStatus,
  type EventType,
  type PrismaClient,
} from '@prisma/client'

/**
 * Seat accounting and waitlist rules.
 *
 * The one rule that governs everything here: **a registration occupies
 * `guests + 1` seats**, never one. A family of five booking together must not
 * be able to walk into a room that only has two chairs left.
 */

/** Seats a single registration consumes. */
export function seatsFor(registration: { guests: number }) {
  return registration.guests + 1
}

export type Availability = {
  capacity: number | null
  seatsTaken: number
  seatsLeft: number | null
  isFull: boolean
  waitlistCount: number
}

/** Live seat count for an event. Cancelled and waitlisted rows take no seats. */
export async function getAvailability(
  db: PrismaClient,
  event: { id: string; capacity: number | null },
): Promise<Availability> {
  const [confirmed, waitlisted] = await Promise.all([
    db.eventRegistration.aggregate({
      where: { eventId: event.id, status: RegistrationStatus.CONFIRMED },
      _sum: { guests: true },
      _count: { _all: true },
    }),
    db.eventRegistration.count({
      where: { eventId: event.id, status: RegistrationStatus.WAITLISTED },
    }),
  ])

  const seatsTaken = (confirmed._count._all ?? 0) + (confirmed._sum.guests ?? 0)
  const seatsLeft = event.capacity === null ? null : Math.max(0, event.capacity - seatsTaken)

  return {
    capacity: event.capacity,
    seatsTaken,
    seatsLeft,
    isFull: seatsLeft !== null && seatsLeft <= 0,
    waitlistCount: waitlisted,
  }
}

/** Can this party of `seats` still be confirmed, or must they wait? */
export function canConfirm(availability: Availability, seats: number) {
  return availability.seatsLeft === null || availability.seatsLeft >= seats
}

export type RegistrationWindow =
  | { open: true }
  | { open: false; reason: string }

/** Every reason a registration might be refused, in the order a person meets them. */
export function registrationWindow(
  event: {
    status: EventStatus
    requiresRegistration: boolean
    registrationClosesAt: Date | null
    startsAt: Date
  },
  now = new Date(),
): RegistrationWindow {
  if (event.status === EventStatus.CANCELLED) {
    return { open: false, reason: 'This event has been cancelled.' }
  }
  if (event.status === EventStatus.DRAFT) {
    return { open: false, reason: 'This event is not open yet.' }
  }
  if (!event.requiresRegistration) {
    return { open: false, reason: 'No booking needed for this one — just come along.' }
  }
  if (event.registrationClosesAt && now > event.registrationClosesAt) {
    return { open: false, reason: 'Registration for this event has closed.' }
  }
  if (now > event.startsAt) {
    return { open: false, reason: 'This event has already started.' }
  }
  return { open: true }
}

/** May this person still withdraw themselves? */
export function canSelfCancel(
  event: { cancellationDeadline: Date | null; startsAt: Date },
  now = new Date(),
) {
  const deadline = event.cancellationDeadline ?? event.startsAt
  return now < deadline
}

/**
 * Promotes waitlisted people into seats that have just opened up.
 *
 * Strictly first-come-first-served by queue position, and it will **skip** a
 * party too large for the remaining seats rather than bumping them ahead of
 * someone smaller — but it keeps looking, so a single freed seat still goes to
 * the next person who actually fits.
 */
export async function promoteFromWaitlist(
  db: PrismaClient,
  event: { id: string; capacity: number | null },
) {
  if (event.capacity === null) return []

  const waiting = await db.eventRegistration.findMany({
    where: { eventId: event.id, status: RegistrationStatus.WAITLISTED },
    orderBy: [{ waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, guests: true, name: true, email: true, token: true, code: true },
  })
  if (waiting.length === 0) return []

  let availability = await getAvailability(db, event)
  const promoted: typeof waiting = []

  for (const candidate of waiting) {
    const seats = seatsFor(candidate)
    if (availability.seatsLeft === null || availability.seatsLeft < seats) continue

    await db.eventRegistration.update({
      where: { id: candidate.id },
      data: { status: RegistrationStatus.CONFIRMED, waitlistPosition: null },
    })
    promoted.push(candidate)
    availability = { ...availability, seatsLeft: availability.seatsLeft - seats }
  }

  if (promoted.length > 0) await renumberWaitlist(db, event.id)
  return promoted
}

/** Closes gaps so positions always read 1, 2, 3… */
export async function renumberWaitlist(db: PrismaClient, eventId: string) {
  const waiting = await db.eventRegistration.findMany({
    where: { eventId, status: RegistrationStatus.WAITLISTED },
    orderBy: [{ waitlistPosition: 'asc' }, { createdAt: 'asc' }],
    select: { id: true },
  })

  await db.$transaction(
    waiting.map((row, index) =>
      db.eventRegistration.update({ where: { id: row.id }, data: { waitlistPosition: index + 1 } }),
    ),
  )
}

/** Long, unguessable value carried in the QR image. */
export function newRegistrationToken() {
  return randomBytes(24).toString('base64url')
}

/**
 * Short code a volunteer can read aloud and type in.
 *
 * Excludes 0/O/1/I/L to stop check-in desk arguments, and is generated with a
 * CSPRNG rather than Math.random because it is a second way in to the booking.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function newRegistrationCode() {
  let out = ''
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  return out
}

export const eventTypeLabels: Record<EventType, string> = {
  SERVICE: 'Service',
  CONFERENCE: 'Conference',
  CRUSADE: 'Crusade',
  RETREAT: 'Retreat',
  BAPTISM: 'Baptism',
  MEMBERSHIP_CLASS: 'Membership class',
  SMALL_GROUP: 'Small group',
  PRAYER_MEETING: 'Prayer meeting',
  OUTREACH: 'Outreach',
  WORKSHOP: 'Workshop',
  OTHER: 'Gathering',
}

export const eventTypeEmoji: Record<EventType, string> = {
  SERVICE: '⛪',
  CONFERENCE: '🎤',
  CRUSADE: '🔥',
  RETREAT: '🏕️',
  BAPTISM: '💧',
  MEMBERSHIP_CLASS: '📋',
  SMALL_GROUP: '🏠',
  PRAYER_MEETING: '🙏',
  OUTREACH: '🤝',
  WORKSHOP: '🛠️',
  OTHER: '🎉',
}

/** Minor units → display string. Money is never stored as a float. */
export function formatPrice(minorUnits: number, currency: string) {
  if (minorUnits === 0) return 'Free'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minorUnits / 100)
}

export function formatEventDate(startsAt: Date, endsAt: Date | null) {
  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(startsAt)

  const time = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit' })
  const start = time.format(startsAt)
  if (!endsAt) return `${date} · ${start}`

  const sameDay = startsAt.toDateString() === endsAt.toDateString()
  return sameDay
    ? `${date} · ${start}–${time.format(endsAt)}`
    : `${date} · ${start} — ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' }).format(endsAt)}`
}
