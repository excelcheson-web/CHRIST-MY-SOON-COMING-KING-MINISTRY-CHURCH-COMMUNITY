import { CalendarCheck, Clock, MapPin } from 'lucide-react'
import Link from 'next/link'

import type { ServiceTime } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

const weekdays = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const

/**
 * How many days until this service comes round again, or `null` if the day
 * column does not name a weekday.
 *
 * Service days are free text an administrator types, so this reads rather than
 * assumes: "Sunday", "Sundays" and "sunday" all match, and "Every other
 * Tuesday" politely matches nothing and gets no badge. A wrong "Today" on a
 * church home page sends somebody out to a locked building.
 */
function daysUntil(day: string, from = new Date()): number | null {
  const normalised = day.trim().toLowerCase().replace(/s$/, '')
  const index = weekdays.indexOf(normalised as (typeof weekdays)[number])
  if (index === -1) return null
  return (index - from.getDay() + 7) % 7
}

/**
 * When the church gathers.
 *
 * Given its own band rather than a line of small print, because for somebody
 * who has never been here it is the single most useful fact on the page — and
 * because these services have names worth reading. The next one coming up is
 * marked, which is the whole reason to compute the day at all.
 */
export function ServiceTimes({ services, address }: { services: ServiceTime[]; address: string }) {
  if (services.length === 0) return null

  const withOffsets = services.map((service) => ({
    ...service,
    inDays: daysUntil(service.day),
  }))

  // The soonest recognisable weekday. Everything unrecognised stays unbadged.
  const soonest = withOffsets.reduce<number | null>((best, service) => {
    if (service.inDays === null) return best
    return best === null || service.inDays < best ? service.inDays : best
  }, null)

  return (
    <section aria-labelledby="services-heading" className="container py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-[0.18em] text-accent-ink">
          <CalendarCheck className="size-4" aria-hidden />
          Every week
        </p>
        <h2 id="services-heading" className="mt-3 text-3xl sm:text-4xl">
          When we gather
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          Three times a week, and you are welcome at every one of them. Come as you are —
          nobody here is going to look at what you are wearing.
        </p>
      </div>

      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {withOffsets.map((service) => {
          const isNext = service.inDays !== null && service.inDays === soonest

          return (
            <li key={`${service.day}-${service.label}`}>
              <article
                className={cn(
                  'flex h-full flex-col rounded-3xl border-2 bg-card p-7 shadow-soft transition-all sm:p-8',
                  isNext ? 'border-primary/40 shadow-lifted' : 'border-border',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'grid size-12 place-items-center rounded-2xl',
                      isNext ? 'bg-primary text-primary-foreground' : 'bg-primary-soft text-primary',
                    )}
                  >
                    <Clock className="size-6" aria-hidden />
                  </span>
                  {isNext && (
                    <span className="rounded-full bg-accent-gradient px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                      {service.inDays === 0 ? 'Today' : service.inDays === 1 ? 'Tomorrow' : 'Next up'}
                    </span>
                  )}
                </div>

                <p className="mt-6 font-display text-2xl font-extrabold text-foreground">
                  {service.day}
                </p>
                <p className="mt-1 text-pretty font-semibold text-primary">{service.label}</p>
                <p className="mt-4 font-display text-lg font-bold text-foreground">
                  {service.time}
                </p>
              </article>
            </li>
          )
        })}
      </ul>

      <div className="mt-8 flex flex-col items-center justify-center gap-4 text-center sm:flex-row sm:gap-8">
        <p className="flex items-start gap-2 text-pretty text-muted-foreground">
          <MapPin className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
          {address}
        </p>
        <Link
          href="/events"
          className="inline-flex min-h-12 items-center rounded-xl border-2 border-primary/25 px-6 font-display font-semibold text-primary transition-colors hover:bg-primary-soft"
        >
          See what else is on
        </Link>
      </div>
    </section>
  )
}
