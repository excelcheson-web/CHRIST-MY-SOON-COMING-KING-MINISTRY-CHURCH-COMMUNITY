import { RegistrationStatus } from '@prisma/client'
import { ArrowLeft, Download, ExternalLink, QrCode } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { EventForm } from '@/components/events/event-form'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Manage event',
  robots: { index: false, follow: false },
}

/** Date → the value a datetime-local input expects. */
function toLocalInput(date: Date | null) {
  if (!date) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const statusStyles: Record<string, string> = {
  CONFIRMED: 'bg-success/15 text-success',
  WAITLISTED: 'bg-accent-soft text-accent-ink',
  CANCELLED: 'bg-destructive/12 text-destructive',
}

export default async function ManageEventPage({ params }: { params: { slug: string } }) {
  const user = await requireUser(`/admin/events/${params.slug}`)
  if (!canManageEvents(user.role)) redirect('/dashboard?denied=events')
  if (!prisma) notFound()

  const [event, ministries] = await Promise.all([
    prisma.event
      .findUnique({
        where: { slug: params.slug },
        include: {
          registrations: { orderBy: [{ status: 'asc' }, { createdAt: 'asc' }] },
        },
      })
      .catch(() => null),
    prisma.ministry
      .findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } })
      .catch(() => []),
  ])

  if (!event) notFound()

  const confirmed = event.registrations.filter((r) => r.status === RegistrationStatus.CONFIRMED)
  const seats = confirmed.reduce((n, r) => n + r.guests + 1, 0)
  const waiting = event.registrations.filter((r) => r.status === RegistrationStatus.WAITLISTED)
  const checkedIn = event.registrations.filter((r) => r.checkedInAt)

  return (
    <div className="container py-14 sm:py-20">
      <Link
        href="/admin/events"
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
        All events
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl">{event.title}</h1>
          <p className="mt-2 text-muted-foreground">
            <code>/events/{event.slug}</code> · {event.status}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/events/${event.slug}`}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary/25 bg-card px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            <ExternalLink className="size-4" aria-hidden />
            View public page
          </Link>
          <a
            href={`/api/events/${event.slug}/registrations?format=csv`}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary/25 bg-card px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </a>
          <Link
            href={`/admin/events/${event.slug}/check-in`}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-accent-gradient px-4 font-semibold text-accent-foreground transition-colors hover:brightness-105"
          >
            <QrCode className="size-4" aria-hidden />
            Check in
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Places booked</CardDescription>
            <CardTitle className="text-4xl">
              {seats}
              {event.capacity !== null && (
                <span className="text-xl text-muted-foreground"> / {event.capacity}</span>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Bookings</CardDescription>
            <CardTitle className="text-4xl">{confirmed.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={waiting.length > 0 ? 'border-accent/40 bg-accent-soft/40' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Waitlist</CardDescription>
            <CardTitle className="text-4xl">{waiting.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Checked in</CardDescription>
            <CardTitle className="text-4xl">{checkedIn.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section aria-labelledby="registrants" className="mt-14">
        <h2 id="registrants" className="text-2xl sm:text-3xl">
          Who is coming
        </h2>

        {event.registrations.length === 0 ? (
          <p className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center text-muted-foreground">
            Nobody has booked yet.
          </p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-3xl border-2 border-border bg-card">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-border">
                <tr>
                  {['Name', 'Contact', 'Party', 'Status', 'Code', 'Notes', 'Checked in'].map((h) => (
                    <th key={h} className="px-4 py-3 font-display font-bold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {event.registrations.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-foreground">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <a href={`mailto:${r.email}`} className="hover:underline">{r.email}</a>
                      {r.phone && <span className="block">{r.phone}</span>}
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.guests + 1}</td>
                    <td className="px-4 py-3">
                      <span className={cn('rounded-full px-2.5 py-1 text-xs font-bold uppercase', statusStyles[r.status])}>
                        {r.status === 'WAITLISTED' ? `#${r.waitlistPosition ?? '?'}` : r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tracking-wider text-primary">{r.code}</td>
                    <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                      {r.accessibilityNeeds && <span className="block">♿ {r.accessibilityNeeds}</span>}
                      {r.dietaryNotes && <span className="block">🍽️ {r.dietaryNotes}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.checkedInAt
                        ? new Date(r.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="edit-event" className="mt-16 border-t border-border pt-10">
        <h2 id="edit-event" className="text-2xl sm:text-3xl">
          Edit this event
        </h2>
        <div className="mt-8 max-w-2xl">
          <EventForm
            mode="edit"
            ministries={ministries}
            initial={{
              slug: event.slug,
              title: event.title,
              description: event.description ?? '',
              type: event.type,
              startsAt: toLocalInput(event.startsAt),
              endsAt: toLocalInput(event.endsAt),
              locationName: event.locationName ?? '',
              address: event.address ?? '',
              isOnline: event.isOnline,
              onlineUrl: event.onlineUrl ?? '',
              capacity: event.capacity?.toString() ?? '',
              price: (event.price / 100).toString(),
              currency: event.currency,
              ministryId: event.ministryId ?? '',
              status: event.status,
              requiresRegistration: event.requiresRegistration,
              registrationClosesAt: toLocalInput(event.registrationClosesAt),
              cancellationDeadline: toLocalInput(event.cancellationDeadline),
              allowGuests: event.allowGuests,
              maxGuestsPerRegistration: event.maxGuestsPerRegistration.toString(),
              allowWaitlist: event.allowWaitlist,
              collectAccessibility: event.collectAccessibility,
              collectDietary: event.collectDietary,
              isFeatured: event.isFeatured,
            }}
          />
        </div>
      </section>
    </div>
  )
}
