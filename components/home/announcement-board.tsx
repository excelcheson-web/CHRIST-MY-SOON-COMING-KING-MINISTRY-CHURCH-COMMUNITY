import { Megaphone, Pin } from 'lucide-react'

import type { AnnouncementView } from '@/lib/home-content'
import { cn } from '@/lib/utils'

function Card({ item }: { item: AnnouncementView }) {
  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-3xl border-2 bg-card shadow-soft',
        item.pinned ? 'border-primary/35' : 'border-border',
      )}
    >
      {/*
        The design leads when there is one. A church flyer is usually the whole
        message — the text under it is the accessible version of the same thing.
      */}
      {item.image && (
        // eslint-disable-next-line @next/next/no-img-element -- served through an authenticated route
        <img
          src={item.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-full border-b-2 border-border bg-secondary object-cover"
        />
      )}

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          {item.pinned && (
            <span className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
              <Pin className="size-3" aria-hidden />
              Pinned
            </span>
          )}
          {item.ministryName && (
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
              {item.ministryName}
            </span>
          )}
          {item.endsAt && (
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
              Until{' '}
              {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(
                new Date(item.endsAt),
              )}
            </span>
          )}
        </div>

        <h3 className="mt-4 font-display text-xl font-bold text-foreground">{item.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-pretty leading-relaxed text-muted-foreground">
          {item.body}
        </p>
      </div>
    </article>
  )
}

/**
 * The two announcement boards.
 *
 * General notices and departmental ones are kept apart on purpose. A board
 * where the media team's rota sits between two church-wide notices is a board
 * people learn to skim, and then stop reading altogether.
 *
 * The departmental board only ever contains departments the viewer belongs to —
 * that filtering happens in `announcementWhere`, not here.
 */
/**
 * The grid for a board, sized to how many notices are actually on it.
 *
 * A three-column grid holding one notice is a card in the top-left corner and
 * two-thirds of a row of nothing — which is what this looked like to every
 * signed-out visitor, since most notices are members-only. One card centres and
 * stays readable; two share the width; three or more get the full grid.
 */
function boardGrid(count: number, top: string) {
  if (count === 1) return `${top} mx-auto grid max-w-2xl gap-6`
  if (count === 2) return `${top} mx-auto grid max-w-5xl gap-6 sm:grid-cols-2`
  return `${top} grid gap-6 sm:grid-cols-2 xl:grid-cols-3`
}

export function AnnouncementBoard({
  general,
  departmental,
}: {
  general: AnnouncementView[]
  departmental: AnnouncementView[]
}) {
  if (general.length === 0 && departmental.length === 0) return null

  return (
    <section aria-labelledby="announcements-heading" className="container py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-[0.18em] text-accent-ink">
          <Megaphone className="size-4" aria-hidden />
          Notices
        </p>
        <h2 id="announcements-heading" className="mt-3 text-3xl sm:text-4xl">
          What you need to know
        </h2>
      </div>

      {general.length > 0 && (
        <ul className={boardGrid(general.length, 'mt-12')}>
          {general.map((item) => (
            <li key={item.id}>
              <Card item={item} />
            </li>
          ))}
        </ul>
      )}

      {departmental.length > 0 && (
        <div className="mt-14">
          <h3 className="text-2xl sm:text-3xl">From your department</h3>
          <p className="mt-2 text-muted-foreground">
            Only the departments you are part of.
          </p>
          <ul className={boardGrid(departmental.length, 'mt-6')}>
            {departmental.map((item) => (
              <li key={item.id}>
                <Card item={item} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
