import { CalendarDays, Clock, Eye, Headphones, PlayCircle } from 'lucide-react'
import Link from 'next/link'

import { photoProps } from '@/lib/photos'
import type { SermonCard as SermonCardData } from '@/lib/sermons'
import { cn } from '@/lib/utils'

export function SermonCard({ sermon }: { sermon: SermonCardData }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border-2 border-border bg-card shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted">
      {/*
        Cover art is optional, so the fallback is a designed panel rather than a
        grey box — a sermon list with no thumbnails should still look finished.
      */}
      <div
        className={cn(
          'relative flex h-40 items-center justify-center overflow-hidden sm:h-44',
          sermon.image ? 'bg-secondary' : 'bg-royal-gradient',
        )}
      >
        {sermon.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote host, so next/image would need a config entry per church
          <img
            src={sermon.image}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          // A photograph rather than a lone glyph, so a list of sermons with no
          // cover art of its own still looks deliberate.
          /* eslint-disable-next-line @next/next/no-img-element -- fixed, pre-sized asset */
          <img
            {...photoProps('scripture', 'sm')}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover opacity-70"
          />
        )}

        {sermon.seriesTitle && (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary shadow-soft">
            {sermon.seriesTitle}
          </span>
        )}

        <span className="absolute bottom-4 right-4 flex gap-2">
          {sermon.hasVideo && (
            <span className="flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              <PlayCircle className="size-3.5" aria-hidden />
              Watch
            </span>
          )}
          {sermon.hasAudio && (
            <span className="flex items-center gap-1 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
              <Headphones className="size-3.5" aria-hidden />
              Listen
            </span>
          )}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-7">
        {sermon.status !== 'PUBLISHED' && (
          <span className="mb-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {sermon.status === 'DRAFT' ? 'Draft — only staff can see this' : 'Archived'}
          </span>
        )}

        <h2 className="text-xl sm:text-2xl">
          <Link
            href={`/sermons/${sermon.slug}`}
            className="rounded transition-colors hover:text-primary"
          >
            {sermon.title}
          </Link>
        </h2>

        <p className="mt-2 font-semibold text-primary">{sermon.speaker}</p>

        {sermon.biblePassage && (
          <p className="mt-1 text-sm font-semibold text-accent-ink">📖 {sermon.biblePassage}</p>
        )}

        {sermon.description && (
          <p className="mt-3 line-clamp-3 text-pretty text-muted-foreground">
            {sermon.description}
          </p>
        )}

        <dl className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-2 pt-5 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            <dt className="sr-only">Preached</dt>
            <dd>
              <time dateTime={sermon.dateISO}>{sermon.date}</time>
            </dd>
          </div>

          {sermon.duration && (
            <div className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              <dt className="sr-only">Length</dt>
              <dd>{sermon.duration}</dd>
            </div>
          )}

          {sermon.viewCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Eye className="size-4" aria-hidden />
              <dt className="sr-only">Views</dt>
              <dd>
                {sermon.viewCount} {sermon.viewCount === 1 ? 'listen' : 'listens'}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  )
}
