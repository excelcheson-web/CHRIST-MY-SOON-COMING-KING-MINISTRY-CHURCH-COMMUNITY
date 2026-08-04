import { EventStatus, RegistrationStatus } from '@prisma/client'
import { CalendarDays, Plus, QrCode, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { eventTypeEmoji, eventTypeLabels, formatEventDate } from '@/lib/events'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Events',
  robots: { index: false, follow: false },
}

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-secondary text-muted-foreground',
  PUBLISHED: 'bg-success/15 text-success',
  CANCELLED: 'bg-destructive/12 text-destructive',
  COMPLETED: 'bg-primary-soft text-primary',
}

export default async function AdminEventsPage() {
  const user = await requireUser('/admin/events')
  if (!canManageEvents(user.role)) redirect('/dashboard?denied=events')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Events</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const eventRows = await prisma.event.findMany({
    orderBy: { startsAt: 'desc' },
    take: 60,
    include: { ministry: { select: { name: true } } },
  })

  /*
   * Two grouped aggregates instead of loading every registration for every
   * event. Sixty events with a few hundred bookings each was tens of thousands
   * of rows crossing the wire to produce three counters per card.
   */
  const [byStatus, checkedInRows] = await Promise.all([
    prisma.eventRegistration.groupBy({
      by: ['eventId', 'status'],
      where: { eventId: { in: eventRows.map((row) => row.id) } },
      _sum: { guests: true },
      _count: { _all: true },
    }),
    prisma.eventRegistration.groupBy({
      by: ['eventId'],
      where: { eventId: { in: eventRows.map((row) => row.id) }, checkedInAt: { not: null } },
      _count: { _all: true },
    }),
  ])

  const stats = new Map<string, { seats: number; confirmed: number; waiting: number; checkedIn: number }>()
  const statsFor = (id: string) => {
    let entry = stats.get(id)
    if (!entry) {
      entry = { seats: 0, confirmed: 0, waiting: 0, checkedIn: 0 }
      stats.set(id, entry)
    }
    return entry
  }

  for (const row of byStatus) {
    const entry = statsFor(row.eventId)
    const count = row._count._all ?? 0
    if (row.status === RegistrationStatus.CONFIRMED) {
      entry.confirmed = count
      entry.seats = count + (row._sum.guests ?? 0)
    } else if (row.status === RegistrationStatus.WAITLISTED) {
      entry.waiting = count
    }
  }
  for (const row of checkedInRows) statsFor(row.eventId).checkedIn = row._count._all ?? 0

  const events = eventRows.map((row) => ({
    ...row,
    stats: stats.get(row.id) ?? { seats: 0, confirmed: 0, waiting: 0, checkedIn: 0 },
  }))

  const upcoming = events.filter(
    (e) => e.startsAt >= new Date() && e.status !== EventStatus.CANCELLED,
  ).length
  const totalSeats = events.reduce((sum, e) => sum + e.stats.seats, 0)
  const totalCheckedIn = events.reduce((sum, e) => sum + e.stats.checkedIn, 0)

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
            <CalendarDays className="size-8" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
              What&apos;s on
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl">Events</h1>
          </div>
        </div>

        <Link
          href="/admin/events/new"
          className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="size-5" aria-hidden />
          New event
        </Link>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Coming up</CardDescription>
            <CardTitle className="text-4xl">{upcoming}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Places booked</CardDescription>
            <CardTitle className="text-4xl">{totalSeats}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Checked in</CardDescription>
            <CardTitle className="text-4xl">{totalCheckedIn}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {events.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <CalendarDays className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">No events yet</p>
          <p className="mt-2 text-muted-foreground">
            Create your first one and it will appear on{' '}
            <Link href="/events" className="font-semibold text-primary hover:underline">
              /events
            </Link>{' '}
            once published.
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {events.map((event) => {
            const { seats, waiting, checkedIn } = event.stats

            return (
              <li key={event.id}>
                <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                            statusStyles[event.status],
                          )}
                        >
                          {event.status}
                        </span>
                        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          {eventTypeEmoji[event.type]} {eventTypeLabels[event.type]}
                        </span>
                      </div>

                      <h2 className="mt-3 font-display text-xl font-bold text-foreground">
                        {event.title}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatEventDate(event.startsAt, event.endsAt)}
                        {event.ministry && ` · ${event.ministry.name}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link
                        href={`/admin/events/${event.slug}`}
                        className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary/25 bg-card px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
                      >
                        <Users className="size-4" aria-hidden />
                        Manage
                      </Link>
                      <Link
                        href={`/admin/events/${event.slug}/check-in`}
                        className="flex min-h-11 items-center gap-2 rounded-xl bg-accent-gradient px-4 font-semibold text-accent-foreground transition-colors hover:brightness-105"
                      >
                        <QrCode className="size-4" aria-hidden />
                        Check in
                      </Link>
                    </div>
                  </div>

                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="inline font-semibold text-muted-foreground">Booked: </dt>
                      <dd className="inline font-bold text-foreground">
                        {seats}
                        {event.capacity !== null && ` / ${event.capacity}`}
                      </dd>
                    </div>
                    {waiting > 0 && (
                      <div>
                        <dt className="inline font-semibold text-muted-foreground">Waitlist: </dt>
                        <dd className="inline font-bold text-foreground">{waiting}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline font-semibold text-muted-foreground">Checked in: </dt>
                      <dd className="inline font-bold text-foreground">{checkedIn}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
