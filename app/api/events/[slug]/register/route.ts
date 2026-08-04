import { Prisma, RegistrationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import {
  canConfirm,
  getAvailability,
  newRegistrationCode,
  newRegistrationToken,
  registrationWindow,
  seatsFor,
} from '@/lib/events'
import { notifyEventRegistered } from '@/lib/notify'
import { clientIp, peekRateLimit, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { eventRegistrationSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

export type RegisterResult = {
  token: string
  code: string
  waitlisted: boolean
  waitlistPosition: number | null
  seatsBooked: number
}

/**
 * POST /api/events/[slug]/register
 *
 * Open to guests as well as members. Two things carry the weight here:
 * a party of N takes N seats (not one), and the confirm/waitlist decision is
 * made inside a transaction so two people racing for the last seat cannot both
 * win it.
 */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  sweepRateLimits()

  const user = await getApiUser()
  const ip = clientIp(request.headers)

  // A generous attempts bucket stops hammering; the real allowance is only
  // spent on a booking that actually succeeds.
  const attempts = rateLimit(`event-attempt:${ip}`, 40, HOUR)
  if (!attempts.ok) {
    return jsonError('Too many attempts. Please wait a few minutes and try again.', 429)
  }

  const bookingKey = user ? `event-book:${user.id}` : `event-book:${ip}`
  const bookingMax = user ? 30 : 8
  if (!peekRateLimit(bookingKey, bookingMax).ok) {
    return jsonError('That is a lot of bookings from here today. Please contact the church office.', 429)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = eventRegistrationSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the highlighted fields and try again.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const input = parsed.data

  try {
    const db = requirePrisma()

    const event = await db.event.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        title: true,
        status: true,
        startsAt: true,
        capacity: true,
        requiresRegistration: true,
        registrationClosesAt: true,
        allowGuests: true,
        maxGuestsPerRegistration: true,
        allowWaitlist: true,
      },
    })
    if (!event) return jsonError('Event not found.', 404)

    const window = registrationWindow(event)
    if (!window.open) return jsonError(window.reason, 409)

    if (!event.allowGuests && input.guests > 0) {
      return jsonError('This event is one place per person.', 422, {
        guests: ['This event is one place per person.'],
      })
    }
    if (input.guests > event.maxGuestsPerRegistration) {
      const limit = event.maxGuestsPerRegistration
      return jsonError(`You can bring up to ${limit} ${limit === 1 ? 'guest' : 'guests'}.`, 422, {
        guests: [`You can bring up to ${limit} ${limit === 1 ? 'guest' : 'guests'}.`],
      })
    }

    const seats = seatsFor(input)

    const result = await db.$transaction(async (tx) => {
      const availability = await getAvailability(tx as never, event)
      const confirmed = canConfirm(availability, seats)

      if (!confirmed && !event.allowWaitlist) return { full: true as const }

      const position = confirmed ? null : availability.waitlistCount + 1

      const created = await tx.eventRegistration.create({
        data: {
          eventId: event.id,
          userId: user?.id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          guests: input.guests,
          accessibilityNeeds: input.accessibilityNeeds,
          dietaryNotes: input.dietaryNotes,
          status: confirmed ? RegistrationStatus.CONFIRMED : RegistrationStatus.WAITLISTED,
          waitlistPosition: position,
          token: newRegistrationToken(),
          code: newRegistrationCode(),
        },
        select: { token: true, code: true, status: true, waitlistPosition: true },
      })

      return { full: false as const, created }
    })

    if (result.full) {
      return jsonError('This event is full and the waitlist is closed.', 409)
    }

    rateLimit(bookingKey, bookingMax, 24 * HOUR)

    const waitlisted = result.created.status === RegistrationStatus.WAITLISTED

    await notifyEventRegistered(
      { name: input.name, email: input.email },
      { title: event.title, startsAt: event.startsAt, code: result.created.code, waitlisted },
    )

    revalidatePath(`/events/${params.slug}`)
    revalidatePath('/admin/events')

    return jsonOk<RegisterResult>(
      {
        token: result.created.token,
        code: result.created.code,
        waitlisted,
        waitlistPosition: result.created.waitlistPosition,
        seatsBooked: seats,
      },
      201,
    )
  } catch (error) {
    // The (eventId, email) unique index caught a repeat booking.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(
        'That email address is already registered for this event. Check your inbox for the booking.',
        409,
        { email: ['Already registered for this event.'] },
      )
    }
    return databaseError('events register', error)
  }
}
