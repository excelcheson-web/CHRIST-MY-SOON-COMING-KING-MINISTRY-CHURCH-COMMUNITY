import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Where a scanned QR code lands.
 *
 * The same URL serves two people. A steward with a phone gets sent to the
 * check-in desk for that event; anyone else — the attendee themselves, or a
 * stranger who scanned a screenshot — just sees the pass. Crucially, **this
 * page never checks anybody in**: that only happens through the authenticated
 * POST, so a QR photographed off someone's screen cannot mark them present.
 */
export default async function CheckInRedirectPage({ params }: { params: { token: string } }) {
  if (!prisma) redirect('/events')

  const registration = await prisma.eventRegistration
    .findUnique({
      where: { token: params.token },
      select: { event: { select: { slug: true } } },
    })
    .catch(() => null)

  if (!registration) redirect('/events')

  const session = await auth()
  const slug = registration.event.slug

  if (canManageEvents(session?.user?.role)) {
    redirect(`/admin/events/${slug}/check-in`)
  }

  redirect(`/events/${slug}/booked/${params.token}`)
}
