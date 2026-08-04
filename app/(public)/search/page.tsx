import { BookOpen, CalendarDays, FileText, Search, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { search, type SearchResultKind } from '@/lib/search'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search sermons, testimonies, events and every page on this site.',
  // A results page is not something a search engine should index — it would
  // compete with the pages it points at.
  robots: { index: false, follow: true },
}

const kindLabels: Record<SearchResultKind, { label: string; Icon: typeof Search }> = {
  sermon: { label: 'Sermon', Icon: BookOpen },
  testimony: { label: 'Testimony', Icon: Sparkles },
  event: { label: 'Event', Icon: CalendarDays },
  page: { label: 'Page', Icon: FileText },
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const query = (searchParams.q ?? '').trim()
  const results = query.length >= 2 ? await search(query) : []

  return (
    <>
      <PageHero
        eyebrow="Search"
        title={query ? `Results for “${query}”` : 'Search this site'}
        subtitle="Sermons, testimonies, events and every page. The community is not searched — what members share there stays inside the church family."
      />

      <div className="container pb-20 pt-4">
        <form action="/search" method="get" className="mx-auto max-w-2xl">
          <label htmlFor="q" className="sr-only">
            What are you looking for?
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={query}
                autoComplete="off"
                placeholder="A sermon, a passage, a name…"
                className="h-14 w-full rounded-xl border-2 border-input bg-card pl-12 pr-4 text-base text-foreground"
              />
            </div>
            <button
              type="submit"
              className="flex min-h-14 items-center rounded-xl bg-primary px-7 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Search
            </button>
          </div>
        </form>

        {query.length === 1 && (
          <p className="mx-auto mt-8 max-w-2xl text-center text-muted-foreground">
            One letter matches almost everything — try a word.
          </p>
        )}

        {query.length >= 2 && (
          <div className="mx-auto mt-12 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {results.length === 0
                ? 'Nothing found'
                : `${results.length} result${results.length === 1 ? '' : 's'}`}
            </p>

            {results.length === 0 ? (
              <div className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center">
                <p className="text-pretty text-lg text-muted-foreground">
                  Nothing here matched “{query}”.
                </p>
                <p className="mt-3 text-pretty text-muted-foreground">
                  Try a shorter word, or{' '}
                  <Link href="/sermons" className="font-semibold text-primary hover:underline">
                    browse the sermons
                  </Link>
                  . If you are looking for something in the community, you will need to{' '}
                  <Link href="/login" className="font-semibold text-primary hover:underline">
                    sign in
                  </Link>{' '}
                  and look there.
                </p>
              </div>
            ) : (
              <ul className="mt-6 space-y-4">
                {results.map((result) => {
                  const { label, Icon } = kindLabels[result.kind]
                  return (
                    <li key={`${result.kind}-${result.href}`}>
                      <Link
                        href={result.href}
                        className="group flex gap-4 rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/30 sm:p-6"
                      >
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                          <Icon className="size-5" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                              {label}
                            </span>
                            {result.when && (
                              <span className="text-sm text-muted-foreground">
                                {formatDate(new Date(result.when))}
                              </span>
                            )}
                          </span>
                          <span className="mt-2 block font-display text-lg font-bold text-foreground group-hover:text-primary">
                            {result.title}
                          </span>
                          {result.excerpt && (
                            <span className="mt-1 block text-pretty text-sm text-muted-foreground">
                              {result.excerpt}
                            </span>
                          )}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}
