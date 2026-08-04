import { RegistrationStatus } from '@prisma/client'
import { ArrowLeft, Printer } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CancelBookingButton } from '@/components/events/cancel-booking'
import { EventPass } from '@/components/events/event-pass'
import { PageHero } from '@/components/page-hero'
import { Alert } from '@/components/ui/alert'
import { canSelfCancel, formatEventDate } from '@/lib/events'
import { prisma } from '@/lib/prisma'
import { registrationQrDataUrl } from '@/lib/qr'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Your booking',
  // The token is in the URL — never let this be indexed or referred onward.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function BookedPage({
  params,
}: {
  params: { slug: string; token: string }
}) {
  if (!prisma) notFound()

  const settings = await getSiteSettings()

  const registration = await prisma.eventRegistration
    .findUnique({
      where: { token: params.token },
      include: {
        event: {
          select: {
            slug: true,
            title: true,
            startsAt: true,
            endsAt: true,
            locationName: true,
            address: true,
            isOnline: true,
            onlineUrl: true,
            status: true,
            cancellationDeadline: true,
          },
        },
      },
    })
    .catch(() => null)

  if (!registration || registration.event.slug !== params.slug) notFound()

  const waitlisted = registration.status === RegistrationStatus.WAITLISTED
  const cancelled = registration.status === RegistrationStatus.CANCELLED
  const qr = cancelled ? '' : await registrationQrDataUrl(registration.token, settings.url)

  const where = registration.event.isOnline
    ? 'Online'
    : [registration.event.locationName, registration.event.address].filter(Boolean).join(' · ') || null

  return (
    <>
      <PageHero
        eyebrow="You are booked"
        title={cancelled ? 'Booking cancelled' : waitlisted ? 'You are on the waitlist' : 'See you there'}
        subtitle={
          cancelled
            ? 'This booking has been withdrawn. You are welcome to book again if places remain.'
            : waitlisted
              ? 'We will confirm you automatically if a place opens up.'
              : 'Save this page or screenshot the code — that is all you need at the door.'
        }
        emoji="🎟️"
        crumbs={[
          { href: '/events', label: 'Events' },
          { href: `/events/${params.slug}`, label: registration.event.title },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mx-auto max-w-lg">
          {cancelled ? (
            <Alert variant="info">
              This booking was cancelled.{' '}
              <Link href={`/events/${params.slug}`} className="font-semibold underline">
                View the event
              </Link>{' '}
              to book again.
            </Alert>
          ) : (
            <>
              <EventPass
                title={registration.event.title}
                when={formatEventDate(registration.event.startsAt, registration.event.endsAt)}
                where={where}
                qrDataUrl={qr}
                code={registration.code}
                guests={registration.guests}
                waitlisted={waitlisted}
                waitlistPosition={registration.waitlistPosition}
              />

              <div className="mt-8 rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
                <h2 className="font-display text-lg font-bold text-foreground">Keep this safe</h2>
                <p className="mt-2 text-pretty text-muted-foreground">
                  We have emailed a copy to <strong>{registration.email}</strong>. You can also
                  bookmark this page — the link is unique to you.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href={`/events/${params.slug}`}
                    className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary/25 bg-card px-5 font-display font-semibold text-primary transition-colors hover:bg-primary-soft"
                  >
                    <ArrowLeft className="size-5" aria-hidden />
                    Back to the event
                  </Link>
                  <span className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-secondary px-5 font-display font-semibold text-secondary-foreground">
                    <Printer className="size-5" aria-hidden />
                    Print this page
                  </span>
                </div>

                {canSelfCancel(registration.event) && (
                  <div className="mt-6 border-t border-border pt-5">
                    <CancelBookingButton token={registration.token} slug={params.slug} />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
