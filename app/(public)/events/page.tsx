import { EventStatus, RegistrationStatus } from '@prisma/client'

import type { Metadata } from 'next'
import Link from 'next/link'

import { EventCard, type EventCardData } from '@/components/events/event-card'
import { CalendarDays } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { eventTypeEmoji, eventTypeLabels, formatEventDate, formatPrice } from '@/lib/events'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Church Events, Services & Crusades',
  description:
    'Sunday services, deliverance nights, conferences, retreats and baptisms. See what is coming up and book a place in under a minute — everyone is welcome.',
  alternates: { canonical: '/events' },
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: { when?: string }
}) {
  const showPast = searchParams.when === 'past'
  const settings = await getSiteSettings()

  const records = prisma
    ? await prisma.event
        .findMany({
          where: {
            status: { in: [EventStatus.PUBLISHED, EventStatus.CANCELLED] },
            ...(showPast ? { startsAt: { lt: new Date() } } : { startsAt: { gte: new Date() } }),
          },
          orderBy: { startsAt: showPast ? 'desc' : 'asc' },
          take: 40,
          include: { ministry: { select: { name: true } } },
        })
        .catch((error) => {
          console.error('[events]', error)
          return []
        })
    : []

  /*
   * Seat counts come from one grouped aggregate rather than loading every
   * registration row. The previous version pulled every booking for all 40
   * events just to add up guests — on a well-attended conference that is
   * thousands of rows fetched to compute two numbers.
   */
  const seatsByEvent = new Map<string, number>()
  if (prisma && records.length > 0) {
    const grouped = await prisma.eventRegistration
      .groupBy({
        by: ['eventId'],
        where: {
          eventId: { in: records.map((record) => record.id) },
          status: RegistrationStatus.CONFIRMED,
        },
        _sum: { guests: true },
        _count: { _all: true },
      })
      .catch(() => [])

    for (const row of grouped) {
      // Each booking is one seat plus everyone they are bringing.
      seatsByEvent.set(row.eventId, (row._count._all ?? 0) + (row._sum.guests ?? 0))
    }
  }

  const events: EventCardData[] = records.map((record) => {
    const seatsTaken = seatsByEvent.get(record.id) ?? 0
    const seatsLeft = record.capacity === null ? null : Math.max(0, record.capacity - seatsTaken)

    return {
      slug: record.slug,
      title: record.title,
      description: record.description,
      type: record.type,
      typeLabel: eventTypeLabels[record.type],
      typeEmoji: eventTypeEmoji[record.type],
      when: formatEventDate(record.startsAt, record.endsAt),
      locationName: record.locationName,
      isOnline: record.isOnline,
      priceLabel: formatPrice(record.price, record.currency),
      status: record.status,
      ministryName: record.ministry?.name ?? null,
      seatsLeft,
      isFull: seatsLeft !== null && seatsLeft <= 0,
      requiresRegistration: record.requiresRegistration,
    }
  })

  const tabs = [
    { key: 'upcoming', label: 'Coming up', href: '/events' },
    { key: 'past', label: 'Already happened', href: '/events?when=past' },
  ]
  const active = showPast ? 'past' : 'upcoming'

  return (
    <>
      <PageHero
        eyebrow="What's on"
        title="Events"
        subtitle="Services, conferences, retreats, baptisms and days out. Booking takes under a minute, and you never need an account to come."
        photo="spirit"
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-20 pt-4">
        <nav aria-label="Filter events" className="mb-8">
          <ul className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={tab.href}
                  aria-current={active === tab.key ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-xl border-2 px-4 font-semibold transition-colors',
                    active === tab.key
                      ? 'border-primary/35 bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {events.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <CalendarDays className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              {showPast ? 'Nothing in the archive yet' : 'Nothing on the calendar just yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              {showPast
                ? 'Past events will be listed here once they have happened.'
                : 'Our regular services still run every week — see the times in the footer, and just turn up.'}
            </p>
          </div>
        ) : (
          <ul className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
            {events.map((event) => (
              <li key={event.slug}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        )}

        <div className="mt-16 rounded-3xl border-2 border-border bg-secondary/40 p-7 sm:p-10">
          <h2 className="text-2xl sm:text-3xl">Every week, without fail</h2>
          <p className="mt-4 max-w-2xl text-pretty text-muted-foreground">
            Our regular gatherings need no booking at all. Come as you are.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {settings.serviceTimes.map((service) => (
              <li key={service.day} className="rounded-2xl border-2 border-border bg-card p-5">
                <p className="font-display text-lg font-bold text-foreground">{service.day}</p>
                <p className="mt-1 text-muted-foreground">{service.label}</p>
                <p className="mt-2 font-display font-bold text-primary">{service.time}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  )
}
