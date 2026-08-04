import { BookOpen, Calendar, Users, Video } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * Two doors near the bottom of the home page: what we teach, and what is on.
 *
 * These used to be "coming soon" placeholders that also reprinted the whole
 * weekly service list. The list now has a band of its own directly under the
 * hero, so repeating it here was the same information twice on one page — and
 * the second copy was the one nobody had asked for. Both cards now point at
 * pages that exist.
 */
export async function Teasers() {
  const settings = await getSiteSettings()

  // Never index into this array. An administrator can delete every row from the
  // settings form, and a home page that throws because a church has not filled
  // in its service times yet is a home page that fails on day one.
  const [firstService] = settings.serviceTimes

  return (
    <section aria-labelledby="teasers-heading" className="container py-20 sm:py-24">
      <h2 id="teasers-heading" className="sr-only">
        Sermons and events
      </h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="flex flex-col rounded-3xl border-2 border-border bg-card p-7 shadow-soft sm:p-9">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Video className="size-7" aria-hidden />
          </span>
          <h3 className="mt-6 text-2xl sm:text-3xl">Messages you can play again</h3>
          <p className="mt-3 flex-1 text-pretty text-muted-foreground">
            Every message we record lives in the sermon centre — search it, filter it by
            series or speaker, and pick up the one you missed. Some of them will even answer
            a question about what was preached.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-6">
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Next message
              </dt>
              <dd className="mt-1 text-pretty font-display text-lg font-bold text-foreground">
                {firstService ? `${firstService.day}, ${firstService.time}` : 'In person, weekly'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Where
              </dt>
              <dd className="mt-1 font-display text-lg font-bold text-foreground">In person</dd>
            </div>
          </dl>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sermons">
                <Video aria-hidden />
                Browse the sermons
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/doctrine">
                <BookOpen aria-hidden />
                What we teach
              </Link>
            </Button>
          </div>
        </article>

        <article className="flex flex-col rounded-3xl border-2 border-border bg-card p-7 shadow-soft sm:p-9">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-gradient text-accent-foreground">
            <Calendar className="size-7" aria-hidden />
          </span>
          <h3 className="mt-6 text-2xl sm:text-3xl">Come to something</h3>
          <p className="mt-3 flex-1 text-pretty text-muted-foreground">
            Beyond the weekly services there are conventions, nights of prayer and days out.
            Booking is free, it takes a moment, and you do not need an account to do it — a
            party of five books five seats, so nobody arrives to find there is no room.
          </p>
          <ul className="mt-6 space-y-3 border-t border-border pt-6 text-muted-foreground">
            <li className="flex items-start gap-3">
              <Calendar className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
              Book a seat in under a minute, with or without an account
            </li>
            <li className="flex items-start gap-3">
              <Users className="mt-0.5 size-5 shrink-0 text-accent-ink" aria-hidden />
              Bring your family on one booking, and check in from any phone
            </li>
          </ul>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/events">
                <Calendar aria-hidden />
                See what is on
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/founder">Meet the people who lead</Link>
            </Button>
          </div>
        </article>
      </div>
    </section>
  )
}
