import { RegistrationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canSelfCancel, promoteFromWaitlist, renumberWaitlist } from '@/lib/events'
import { notifyWaitlistPromoted } from '@/lib/notify'
import { canManageEvents } from '@/lib/permissions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * DELETE /api/registrations/[token] — withdraw a booking.
 *
 * The token is the proof of ownership: a guest who booked without an account
 * holds nothing else, and it arrived in their confirmation. Signed-in members
 * and event managers can also act on their own bookings.
 *
 * Freed seats are handed to the waitlist in the same request, so the next
 * family is confirmed the moment someone drops out.
 */
export async function DELETE(_request: Request, { params }: { params: { token: string } }) {
  try {
    const db = requirePrisma()

    const registration = await db.eventRegistration.findUnique({
      where: { token: params.token },
      select: {
        id: true,
        status: true,
        userId: true,
        event: {
          select: {
            id: true,
            slug: true,
            title: true,
            capacity: true,
            startsAt: true,
            cancellationDeadline: true,
          },
        },
      },
    })
    if (!registration) return jsonError('Booking not found.', 404)

    if (registration.status === RegistrationStatus.CANCELLED) {
      return jsonOk({ cancelled: true, alreadyCancelled: true, promoted: 0 })
    }

    const user = await getApiUser()

    // Holding the token is itself the proof of ownership — a guest who booked
    // without an account has nothing else. So the only thing left to enforce is
    // the deadline, which event managers may override.
    if (!canSelfCancel(registration.event) && !canManageEvents(user?.role)) {
      return jsonError('The deadline for changing this booking has passed. Please call the office.', 409)
    }

    await db.eventRegistration.update({
      where: { id: registration.id },
      data: {
        status: RegistrationStatus.CANCELLED,
        cancelledAt: new Date(),
        waitlistPosition: null,
      },
    })

    let promotedCount = 0
    if (registration.status === RegistrationStatus.CONFIRMED) {
      const promoted = await promoteFromWaitlist(db, registration.event)
      promotedCount = promoted.length

      for (const person of promoted) {
        await notifyWaitlistPromoted(
          { name: person.name, email: person.email },
          {
            title: registration.event.title,
            startsAt: registration.event.startsAt,
            code: person.code,
          },
        )
      }
    } else {
      // A waitlisted person dropping out only leaves a gap in the queue.
      await renumberWaitlist(db, registration.event.id)
    }

    revalidatePath(`/events/${registration.event.slug}`)
    revalidatePath('/admin/events')

    return jsonOk({ cancelled: true, alreadyCancelled: false, promoted: promotedCount })
  } catch (error) {
    return databaseError('registrations DELETE', error)
  }
}
