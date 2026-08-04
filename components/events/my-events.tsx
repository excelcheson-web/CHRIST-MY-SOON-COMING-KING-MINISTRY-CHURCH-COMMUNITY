import { CalendarDays, Ticket } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

export type MyEvent = {
  token: string
  eventSlug: string
  title: string
  when: string
  code: string
  status: string
  waitlistPosition: number | null
  guests: number
}

/** The "you are booked for these" block on the member dashboard. */
export function MyEvents({ events }: { events: MyEvent[] }) {
  if (events.length === 0) return null

  return (
    <section aria-labelledby="my-events" className="mt-14">
      <h2 id="my-events" className="text-2xl sm:text-3xl">
        Your upcoming events
      </h2>

      <ul className="mt-6 space-y-4">
        {events.map((event) => {
          const waitlisted = event.status === 'WAITLISTED'

          return (
            <li key={event.token}>
              <Link
                href={`/events/${event.eventSlug}/booked/${event.token}`}
                className={cn(
                  'flex flex-wrap items-center gap-5 rounded-3xl border-2 bg-card p-6 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lifted motion-reduce:hover:translate-y-0',
                  waitlisted ? 'border-accent/40' : 'border-border hover:border-primary/35',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-14 shrink-0 place-items-center rounded-2xl',
                    waitlisted ? 'bg-accent-soft text-accent-ink' : 'bg-primary-soft text-primary',
                  )}
                >
                  {waitlisted ? <CalendarDays className="size-7" /> : <Ticket className="size-7" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-bold text-foreground">
                    {event.title}
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">{event.when}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {waitlisted
                      ? `On the waitlist · #${event.waitlistPosition ?? '—'}`
                      : `Pass code ${event.code}`}
                    {event.guests > 0 && ` · plus ${event.guests}`}
                  </span>
                </span>

                <span className="shrink-0 font-display font-semibold text-primary">
                  {waitlisted ? 'View' : 'Show pass'}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
