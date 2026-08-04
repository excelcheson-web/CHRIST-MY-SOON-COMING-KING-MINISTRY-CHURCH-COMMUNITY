import { EventStatus, RegistrationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { promoteFromWaitlist } from '@/lib/events'
import { notifyEventCancelled, notifyEventUpdated } from '@/lib/notify'
import { canManageEvents } from '@/lib/permissions'
import { eventSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh(slug: string) {
  revalidatePath('/events')
  revalidatePath(`/events/${slug}`)
  revalidatePath('/admin/events')
}

/** PATCH /api/events/[slug] — edit an event. */
export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(user.role)) return jsonError('Not allowed.', 403)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  try {
    const db = requirePrisma()

    const before = await db.event.findUnique({
      where: { slug: params.slug },
      select: { id: true, capacity: true, startsAt: true, status: true },
    })
    if (!before) return jsonError('Event not found.', 404)

    const event = await db.event.update({
      where: { slug: params.slug },
      data: parsed.data,
      select: { id: true, slug: true, title: true, capacity: true, startsAt: true, status: true },
    })

    // Raising the cap should let people off the waitlist immediately.
    const promoted =
      parsed.data.capacity !== before.capacity
        ? await promoteFromWaitlist(db, { id: event.id, capacity: event.capacity })
        : []

    // Only bother people if the date actually moved.
    if (before.startsAt.getTime() !== event.startsAt.getTime()) {
      const registrants = await db.eventRegistration.findMany({
        where: { eventId: event.id, status: { not: RegistrationStatus.CANCELLED } },
        select: { name: true, email: true },
      })
      await notifyEventUpdated(registrants, { title: event.title, startsAt: event.startsAt })
    }

    refresh(params.slug)
    return jsonOk({ ...event, promoted: promoted.length })
  } catch (error) {
    return databaseError('events PATCH', error)
  }
}

/**
 * DELETE /api/events/[slug]
 *
 * An event with registrations is **cancelled, not deleted** — people are
 * holding tickets, and their names are the attendance record. Deleting would
 * destroy both. Only an event nobody booked is removed outright.
 */
export async function DELETE(_request: Request, { params }: { params: { slug: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(user.role)) return jsonError('Not allowed.', 403)

  try {
    const db = requirePrisma()

    const event = await db.event.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        title: true,
        startsAt: true,
        _count: { select: { registrations: true } },
      },
    })
    if (!event) return jsonError('Event not found.', 404)

    if (event._count.registrations === 0) {
      await db.event.delete({ where: { id: event.id } })
      refresh(params.slug)
      return jsonOk({ deleted: true, cancelled: false, notified: 0 })
    }

    const registrants = await db.eventRegistration.findMany({
      where: { eventId: event.id, status: { not: RegistrationStatus.CANCELLED } },
      select: { name: true, email: true },
    })

    await db.event.update({ where: { id: event.id }, data: { status: EventStatus.CANCELLED } })
    await notifyEventCancelled(registrants, { title: event.title, startsAt: event.startsAt })

    refresh(params.slug)
    return jsonOk({ deleted: false, cancelled: true, notified: registrants.length })
  } catch (error) {
    return databaseError('events DELETE', error)
  }
}
