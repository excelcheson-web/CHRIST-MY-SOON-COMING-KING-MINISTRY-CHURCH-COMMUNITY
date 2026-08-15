import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { auth } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Never indexed, never followed.
 *
 * The URL contains a registration token, so a copy of it in a search result is
 * a copy of somebody's event pass on the open web.
 *
 * This declaration is the backstop, not the protection. Every path through the
 * component below ends in a `redirect()`, so the response is a 307 with no
 * HTML body and this tag is never actually rendered. What does the work is the
 * `X-Robots-Tag` header on `/check-in/:path*` in `next.config.mjs`, which
 * travels on the redirect itself. Kept here so that a future branch which
 * renders something inherits the right default rather than the layout's
 * `index: true`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

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
