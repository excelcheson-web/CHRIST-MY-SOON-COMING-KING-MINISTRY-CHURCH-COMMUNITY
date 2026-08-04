import { EventStatus } from '@prisma/client'
import { CalendarDays, Globe, MapPin, Ticket, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EventRegistrationForm } from '@/components/events/registration-form'
import { Markdown } from '@/components/markdown'
import { PageHero } from '@/components/page-hero'
import { Alert } from '@/components/ui/alert'
import {
  eventTypeEmoji,
  eventTypeLabels,
  formatEventDate,
  formatPrice,
  getAvailability,
  registrationWindow,
} from '@/lib/events'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function loadEvent(slug: string) {
  if (!prisma) return null
  return prisma.event
    .findUnique({
      where: { slug },
      include: { ministry: { select: { name: true } }, smallGroup: { select: { name: true } } },
    })
    .catch(() => null)
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const event = await loadEvent(params.slug)
  if (!event) return { title: 'Event not found' }

  return {
    title: event.title,
    description: event.description?.slice(0, 160) ?? formatEventDate(event.startsAt, event.endsAt),
    alternates: { canonical: `/events/${event.slug}` },
  }
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const event = await loadEvent(params.slug)
  // Drafts are not public.
  if (!event || event.status === EventStatus.DRAFT) notFound()

  const availability = prisma
    ? await getAvailability(prisma, event)
    : { capacity: null, seatsTaken: 0, seatsLeft: null, isFull: false, waitlistCount: 0 }

  const window = registrationWindow(event)
  const cancelled = event.status === EventStatus.CANCELLED

  return (
    <>
      <PageHero
        eyebrow={`${eventTypeEmoji[event.type]} ${eventTypeLabels[event.type]}`}
        title={event.title}
        subtitle={formatEventDate(event.startsAt, event.endsAt)}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/events', label: 'Events' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
          <div className="min-w-0">
            {cancelled && (
              <Alert variant="error" className="mb-8">
                This event has been cancelled. If you had booked a place, we have emailed you.
              </Alert>
            )}

            <dl className="grid gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:grid-cols-2 sm:p-8">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <dt className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    When
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {formatEventDate(event.startsAt, event.endsAt)}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                {event.isOnline ? (
                  <Globe className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
                ) : (
                  <MapPin className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
                )}
                <div>
                  <dt className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Where
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {event.isOnline ? 'Online' : (event.locationName ?? 'To be confirmed')}
                    {event.address && (
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">
                        {event.address}
                      </span>
                    )}
                  </dd>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Ticket className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
                <div>
                  <dt className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                    Cost
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {formatPrice(event.price, event.currency)}
                  </dd>
                </div>
              </div>

              {event.requiresRegistration && availability.capacity !== null && (
                <div className="flex items-start gap-3">
                  <Users className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
                  <div>
                    <dt className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Places
                    </dt>
                    <dd className="mt-1 font-semibold text-foreground">
                      {availability.isFull
                        ? `Full · ${availability.waitlistCount} waiting`
                        : `${availability.seatsLeft} of ${availability.capacity} left`}
                    </dd>
                  </div>
                </div>
              )}
            </dl>

            {(event.ministry || event.smallGroup) && (
              <p className="mt-5 text-muted-foreground">
                Hosted by{' '}
                <span className="font-semibold text-foreground">
                  {event.ministry?.name ?? event.smallGroup?.name}
                </span>
              </p>
            )}

            {event.description && (
              <div className="mt-10">
                <Markdown>{event.description}</Markdown>
              </div>
            )}

            {event.isOnline && event.onlineUrl && !cancelled && (
              <div className="mt-10 rounded-2xl border-2 border-accent/30 bg-accent-soft/60 p-6">
                <p className="font-display font-bold text-foreground">Joining link</p>
                <a
                  href={event.onlineUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block break-all font-semibold text-accent-ink underline-offset-4 hover:underline"
                >
                  {event.onlineUrl}
                </a>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-8">
              <h2 className="text-2xl">
                {event.requiresRegistration ? 'Book your place' : 'Just come along'}
              </h2>

              {!window.open ? (
                <Alert variant="info" className="mt-5">
                  {window.reason}
                  {!event.requiresRegistration && (
                    <span className="mt-2 block">
                      No booking needed — we will see you there.
                    </span>
                  )}
                </Alert>
              ) : (
                <div className="mt-6">
                  <EventRegistrationForm
                    slug={event.slug}
                    allowGuests={event.allowGuests}
                    maxGuests={event.maxGuestsPerRegistration}
                    collectAccessibility={event.collectAccessibility}
                    collectDietary={event.collectDietary}
                    isFull={availability.isFull}
                    allowWaitlist={event.allowWaitlist}
                  />
                </div>
              )}

              <p className="mt-6 border-t border-border pt-5 text-sm text-muted-foreground">
                Already booked?{' '}
                <Link href="/dashboard" className="font-semibold text-primary hover:underline">
                  Find your pass
                </Link>{' '}
                in your account, or check your confirmation email.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
