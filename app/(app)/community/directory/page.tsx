import { Search, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { MemberCard } from '@/components/community/member-card'
import { PageHero } from '@/components/page-hero'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  directorySelect,
  directoryWhere,
  interestTags,
  redactProfile,
  skillTags,
  spiritualGifts,
  suggestPeople,
} from '@/lib/profiles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Member directory',
  // Members only, and not something a search engine should ever hold.
  robots: { index: false, follow: false },
}

type SearchParams = {
  q?: string
  gift?: string
  interest?: string
  skill?: string
  mentors?: string
}

export default async function DirectoryPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireUser('/community/directory')

  const filtering = Boolean(
    searchParams.q ||
      searchParams.gift ||
      searchParams.interest ||
      searchParams.skill ||
      searchParams.mentors,
  )

  const [records, suggestions] = await Promise.all([
    prisma
      ? prisma.user
          .findMany({
            where: directoryWhere({
              q: searchParams.q,
              gift: searchParams.gift,
              interest: searchParams.interest,
              skill: searchParams.skill,
              mentors: searchParams.mentors === '1',
            }),
            select: directorySelect,
            orderBy: { name: 'asc' },
            take: 60,
          })
          .catch((error) => {
            console.error('[directory]', error)
            return []
          })
      : Promise.resolve([]),
    filtering ? Promise.resolve([]) : suggestPeople(user.id),
  ])

  const people = records.map((record) => redactProfile(record, user.id))

  const linkWith = (changes: Partial<SearchParams>) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...searchParams, ...changes })) {
      if (value) next.set(key, value)
    }
    const query = next.toString()
    return query ? `/community/directory?${query}` : '/community/directory'
  }

  const chip = (active: boolean) =>
    cn(
      'flex min-h-10 items-center rounded-lg border-2 px-3 text-sm font-semibold transition-colors',
      active
        ? 'border-primary/35 bg-primary-soft text-primary'
        : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
    )

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Member directory"
        subtitle="Find somebody who serves where you serve, lives near you, or has the gift you have been praying for."
        photo="together"
        crumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="rounded-2xl border-2 border-primary/20 bg-primary-soft/60 p-5">
          <p className="text-pretty text-sm text-foreground">
            <strong>You control what people see.</strong> Your email, phone, birthday and area are
            each hidden until you choose otherwise, and you can leave the directory entirely.{' '}
            <Link href="/community/profile" className="font-semibold text-primary hover:underline">
              Manage your profile
            </Link>
            .
          </p>
        </div>

        <form action="/community/directory" className="mt-8 flex flex-wrap gap-3">
          <label className="flex-1 basis-64">
            <span className="sr-only">Search members</span>
            <span className="relative block">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={searchParams.q ?? ''}
                placeholder="Search by name, gift, interest or skill…"
                className="h-14 w-full rounded-xl border-2 border-input bg-card pl-12 pr-4 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              />
            </span>
          </label>
          <button
            type="submit"
            className="flex min-h-14 items-center rounded-xl bg-primary px-7 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Search
          </button>
        </form>

        <nav aria-label="Filter members" className="mt-6 space-y-4">
          <div>
            <p className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Spiritual gift
            </p>
            <ul className="flex flex-wrap gap-2">
              {spiritualGifts.slice(0, 10).map((gift) => (
                <li key={gift}>
                  <Link
                    href={linkWith({ gift: searchParams.gift === gift ? undefined : gift })}
                    className={chip(searchParams.gift === gift)}
                  >
                    {gift}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Can help with
            </p>
            <ul className="flex flex-wrap gap-2">
              {skillTags.slice(0, 10).map((skill) => (
                <li key={skill}>
                  <Link
                    href={linkWith({ skill: searchParams.skill === skill ? undefined : skill })}
                    className={chip(searchParams.skill === skill)}
                  >
                    {skill}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Interests
            </p>
            <ul className="flex flex-wrap gap-2">
              {interestTags.slice(0, 10).map((tag) => (
                <li key={tag}>
                  <Link
                    href={linkWith({ interest: searchParams.interest === tag ? undefined : tag })}
                    className={chip(searchParams.interest === tag)}
                  >
                    {tag}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={linkWith({ mentors: searchParams.mentors === '1' ? undefined : '1' })}
                  className={chip(searchParams.mentors === '1')}
                >
                  🤝 Happy to mentor
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {suggestions.length > 0 && (
          <section aria-labelledby="suggested" className="mt-14">
            <h2 id="suggested" className="text-2xl sm:text-3xl">
              People you may know
            </h2>
            <p className="mt-2 text-muted-foreground">
              Based on where you serve, where you meet, and where you live — nothing else.
            </p>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {suggestions.map(({ profile, reasons }) => (
                <li key={profile.id}>
                  <MemberCard person={profile} reasons={reasons} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl">
            {filtering ? `${people.length} ${people.length === 1 ? 'match' : 'matches'}` : 'Everyone'}
          </h2>
          {filtering && (
            <Link href="/community/directory" className="font-semibold text-primary hover:underline">
              Clear filters
            </Link>
          )}
        </div>

        {people.length === 0 ? (
          <div className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <Users className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              {filtering ? 'Nobody matched that' : 'The directory is empty'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              {filtering
                ? 'Try a different word, or clear the filters.'
                : 'Members appear here once they have filled in a profile and chosen to be listed.'}
            </p>
          </div>
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
            {people.map((person) => (
              <li key={person.id}>
                <MemberCard person={person} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
