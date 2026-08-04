import { CalendarDays, Globe, MapPin, Users } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

export type EventCardData = {
  slug: string
  title: string
  description: string | null
  type: string
  typeLabel: string
  typeEmoji: string
  when: string
  locationName: string | null
  isOnline: boolean
  priceLabel: string
  status: string
  ministryName: string | null
  seatsLeft: number | null
  isFull: boolean
  requiresRegistration: boolean
}

export function EventCard({ event }: { event: EventCardData }) {
  const cancelled = event.status === 'CANCELLED'

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-3xl border-2 bg-card p-6 shadow-soft transition-all sm:p-8',
        cancelled
          ? 'border-destructive/35 opacity-90'
          : 'border-border hover:border-primary/30 hover:shadow-lifted',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          <span aria-hidden>{event.typeEmoji}</span>
          {event.typeLabel}
        </span>

        <span className="flex flex-wrap justify-end gap-2">
          {cancelled && (
            <span className="rounded-full bg-destructive/12 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
              Cancelled
            </span>
          )}
          {!cancelled && event.isFull && (
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
              Waitlist only
            </span>
          )}
          {event.priceLabel !== 'Free' && (
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
              {event.priceLabel}
            </span>
          )}
        </span>
      </div>

      <h2 className="mt-5 text-2xl">
        <Link href={`/events/${event.slug}`} className="rounded transition-colors hover:text-primary">
          {event.title}
        </Link>
      </h2>

      {event.ministryName && (
        <p className="mt-1 text-sm font-semibold text-muted-foreground">{event.ministryName}</p>
      )}

      {event.description && (
        <p className="mt-3 flex-1 text-pretty text-muted-foreground">
          {event.description.length > 180
            ? `${event.description.slice(0, 180).trimEnd()}…`
            : event.description}
        </p>
      )}

      <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
        <div className="flex items-start gap-2">
          <CalendarDays className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
          <dt className="sr-only">When</dt>
          <dd className="font-semibold text-foreground">{event.when}</dd>
        </div>

        {(event.locationName || event.isOnline) && (
          <div className="flex items-start gap-2">
            {event.isOnline ? (
              <Globe className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            ) : (
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            )}
            <dt className="sr-only">Where</dt>
            <dd className="text-muted-foreground">
              {event.isOnline ? 'Online' : event.locationName}
            </dd>
          </div>
        )}

        {event.requiresRegistration && event.seatsLeft !== null && !cancelled && (
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            <dt className="sr-only">Places</dt>
            <dd className={cn('font-semibold', event.isFull ? 'text-muted-foreground' : 'text-foreground')}>
              {event.isFull
                ? 'Full — join the waitlist'
                : `${event.seatsLeft} ${event.seatsLeft === 1 ? 'place' : 'places'} left`}
            </dd>
          </div>
        )}
      </dl>

      <Link
        href={`/events/${event.slug}`}
        className="mt-6 flex min-h-12 items-center justify-center rounded-xl bg-primary px-5 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {cancelled ? 'See details' : event.requiresRegistration ? 'Book a place' : 'See details'}
      </Link>
    </article>
  )
}
