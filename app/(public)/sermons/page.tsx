import { SermonStatus } from '@prisma/client'
import { BookOpen, Search } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'


import { PageHero } from '@/components/page-hero'
import { SermonCard } from '@/components/sermons/sermon-card'
import { auth } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  sermonCardSelect,
  sermonFilterWhere,
  sermonWhere,
  toSermonCard,
} from '@/lib/sermons'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/*
 * Titles here carry the words somebody would actually type.
 *
 * The root layout appends " · CMSCK", so a one-word title like "Sermons"
 * reached a search result as "Sermons · CMSCK" — accurate, and matching
 * nothing anybody searches for. These stay under about 50 characters so the
 * brand suffix still fits before search results truncate at roughly 60.
 */
export const metadata: Metadata = {
  title: 'Sermons — Deliverance & Holy Ghost Messages',
  description:
    'Watch or listen again to every message: deliverance, healing, faith and the power of the Holy Spirit. Search by topic, speaker or Bible passage — free, no account needed.',
  alternates: { canonical: '/sermons' },
}

type SearchParams = { q?: string; series?: string; speaker?: string; topic?: string }

export default async function SermonsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth()
  const canManage = canManageContent(session?.user?.role)

  const where = {
    AND: [
      sermonWhere(canManage),
      sermonFilterWhere({
        q: searchParams.q,
        series: searchParams.series,
        speaker: searchParams.speaker,
        topic: searchParams.topic,
      }),
    ],
  }

  const [records, seriesList, speakerRows, featuredRecord] = prisma
    ? await Promise.all([
        prisma.sermon
          .findMany({ where, select: sermonCardSelect, orderBy: { preachedAt: 'desc' }, take: 48 })
          .catch((error) => {
            console.error('[sermons]', error)
            return []
          }),
        prisma.sermonSeries
          .findMany({
            where: { sermons: { some: sermonWhere(canManage) } },
            orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
            select: { slug: true, title: true, _count: { select: { sermons: true } } },
            take: 12,
          })
          .catch(() => []),
        // One row per speaker, straight from the database — no need to pull
        // every sermon just to build a filter row.
        prisma.sermon
          .groupBy({
            by: ['speaker'],
            where: sermonWhere(canManage),
            _count: { _all: true },
            orderBy: { _count: { speaker: 'desc' } },
            take: 8,
          })
          .catch(() => []),
        prisma.sermon
          .findFirst({
            where: { isFeatured: true, status: SermonStatus.PUBLISHED },
            select: sermonCardSelect,
            orderBy: { preachedAt: 'desc' },
          })
          .catch(() => null),
      ])
    : [[], [], [], null]

  const sermons = records.map(toSermonCard)
  const featured = featuredRecord ? toSermonCard(featuredRecord) : null
  const filtering = Boolean(
    searchParams.q || searchParams.series || searchParams.speaker || searchParams.topic,
  )

  /** Keeps the other filters when one chip is switched. */
  const linkWith = (changes: Partial<SearchParams>) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...searchParams, ...changes })) {
      if (value) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/sermons?${query}` : '/sermons'
  }

  const chip = (active: boolean) =>
    cn(
      'flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 font-semibold transition-colors',
      active
        ? 'border-primary/35 bg-primary-soft text-primary'
        : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
    )

  return (
    <>
      <PageHero
        eyebrow="Sermon Centre"
        title="Sermons"
        subtitle="Every message, kept for you. Watch again, listen on the way to work, or read the notes — nothing here needs an account."
        photo="scripture"
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-20 pt-4">
        <form action="/sermons" className="flex flex-wrap gap-3">
          <label className="flex-1 basis-64">
            <span className="sr-only">Search sermons</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={searchParams.q ?? ''}
                placeholder="Search by title, speaker or passage…"
                className="h-14 w-full rounded-xl border-2 border-input bg-card pl-12 pr-4 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              />
            </span>
          </label>

          {/* Carried through so searching does not silently drop a chip. */}
          {searchParams.series && <input type="hidden" name="series" value={searchParams.series} />}
          {searchParams.topic && <input type="hidden" name="topic" value={searchParams.topic} />}
          {searchParams.speaker && (
            <input type="hidden" name="speaker" value={searchParams.speaker} />
          )}

          <button
            type="submit"
            className="flex min-h-14 items-center rounded-xl bg-primary px-7 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        {seriesList.length > 0 && (
          <nav aria-label="Filter by series" className="mt-6">
            <p className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Series
            </p>
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={linkWith({ series: undefined })}
                  aria-current={!searchParams.series ? 'page' : undefined}
                  className={chip(!searchParams.series)}
                >
                  All series
                </Link>
              </li>
              {seriesList.map((series) => (
                <li key={series.slug}>
                  <Link
                    href={linkWith({ series: series.slug })}
                    aria-current={searchParams.series === series.slug ? 'page' : undefined}
                    className={chip(searchParams.series === series.slug)}
                  >
                    {series.title}
                    <span className="text-sm font-normal opacity-70">
                      ({series._count.sermons})
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {speakerRows.length > 1 && (
          <nav aria-label="Filter by speaker" className="mt-5">
            <p className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Speaker
            </p>
            <ul className="flex flex-wrap gap-2">
              <li>
                <Link
                  href={linkWith({ speaker: undefined })}
                  aria-current={!searchParams.speaker ? 'page' : undefined}
                  className={chip(!searchParams.speaker)}
                >
                  Everyone
                </Link>
              </li>
              {speakerRows.map((row) => (
                <li key={row.speaker}>
                  <Link
                    href={linkWith({ speaker: row.speaker })}
                    aria-current={searchParams.speaker === row.speaker ? 'page' : undefined}
                    className={chip(searchParams.speaker === row.speaker)}
                  >
                    {row.speaker}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {featured && !filtering && (
          <section className="mt-12" aria-labelledby="featured-heading">
            <h2 id="featured-heading" className="text-2xl sm:text-3xl">
              Start here
            </h2>
            <div className="mt-5 grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <SermonCard sermon={featured} />
              </div>
              <div className="rounded-3xl border-2 border-border bg-secondary/40 p-7 sm:p-9 lg:col-span-2">
                <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
                  Featured message
                </p>
                <p className="mt-4 text-pretty text-lg leading-relaxed text-foreground">
                  {featured.description ??
                    'A good place to begin if you are new here — press play and see what you think.'}
                </p>
                <Link
                  href={`/sermons/${featured.slug}`}
                  className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Watch this one
                </Link>
              </div>
            </div>
          </section>
        )}

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl">
            {filtering
              ? `${sermons.length} ${sermons.length === 1 ? 'match' : 'matches'}`
              : 'All sermons'}
          </h2>
          {filtering && (
            <Link href="/sermons" className="font-semibold text-primary hover:underline">
              Clear filters
            </Link>
          )}
        </div>

        {sermons.length === 0 ? (
          <div className="mt-8 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <BookOpen className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              {filtering ? 'Nothing matched that' : 'No sermons yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              {filtering
                ? 'Try a different word, or clear the filters to see everything.'
                : 'Recordings will appear here as soon as they are uploaded. In the meantime, come and join us on Sunday.'}
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
            {sermons.map((sermon) => (
              <li key={sermon.slug}>
                <SermonCard sermon={sermon} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
