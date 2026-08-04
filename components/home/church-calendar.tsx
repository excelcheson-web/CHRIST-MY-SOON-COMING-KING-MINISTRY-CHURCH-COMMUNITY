import { CalendarHeart } from 'lucide-react'

import { countdownLabel, formatChurchDate } from '@/lib/church-year'
import type { CalendarEntry } from '@/lib/home-content'
import { cn } from '@/lib/utils'

/**
 * The church calendar, with a countdown to each date.
 *
 * The dates themselves are computed — Easter and everything hanging off it
 * moves every year, so a hard-coded list would be wrong by March. See
 * `lib/church-year.ts`. A pastor can still change the wording and the artwork
 * from `/admin/calendar`.
 */
export function ChurchCalendar({ dates }: { dates: CalendarEntry[] }) {
  if (dates.length === 0) return null

  const [next, ...rest] = dates

  return (
    <section aria-labelledby="calendar-heading" className="container py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-[0.18em] text-accent-ink">
          <CalendarHeart className="size-4" aria-hidden />
          The Christian year
        </p>
        <h2 id="calendar-heading" className="mt-3 text-3xl sm:text-4xl">
          What we are marking next
        </h2>
        <p className="mt-4 text-pretty text-lg text-muted-foreground">
          The days the whole church keeps together, and how long until each one.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* The next one gets the large treatment — it is the one that matters. */}
        <article className="relative flex min-h-[18rem] flex-col justify-end overflow-hidden rounded-3xl bg-royal-gradient p-7 text-white shadow-lifted sm:p-9">
          {next!.image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- church-supplied artwork of unknown origin */}
              <img
                src={next!.image}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover"
              />
              {/*
                A scrim, not a wash. The photograph used to sit at 35% opacity
                under a near-opaque gradient, which made every card look like a
                flat purple slab whatever picture was behind it. This is opaque
                where the words are and nearly clear at the top, so the text
                keeps its contrast and the picture is still a picture.
              */}
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(243_62%_16%)] via-[hsl(243_62%_16%)]/80 to-[hsl(243_62%_16%)]/25" />
            </>
          )}

          <div className="relative">
            <p className="flex items-center gap-2">
              <span aria-hidden className="text-3xl">
                {next!.emoji}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur">
                {countdownLabel(next!.inDays)}
              </span>
            </p>

            <h3 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">{next!.title}</h3>
            <p className="mt-2 font-semibold text-accent">{formatChurchDate(next!.date)}</p>

            {next!.description && (
              <p className="mt-4 max-w-xl text-pretty leading-relaxed text-white/85">
                {next!.description}
              </p>
            )}
          </div>
        </article>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {rest.slice(0, 3).map((entry) => (
            <li key={entry.key}>
              <article
                className={cn(
                  'flex h-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-5',
                  entry.inDays <= 7 && 'border-primary/35',
                )}
              >
                {/* The emoji is the fallback, not the default: a church that
                    uploads no artwork still gets something in the square. */}
                {entry.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- church-supplied artwork of unknown origin
                  <img
                    src={entry.thumb}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="size-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary text-2xl"
                  >
                    {entry.emoji}
                  </span>
                )}

                <div className="min-w-0">
                  <p className="font-display font-bold text-foreground">{entry.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatChurchDate(entry.date)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {countdownLabel(entry.inDays)}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
