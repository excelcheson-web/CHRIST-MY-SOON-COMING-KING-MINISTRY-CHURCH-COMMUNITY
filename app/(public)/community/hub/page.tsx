import { InitiativeKind } from '@prisma/client'
import { ArrowRight, Cake } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { auth } from '@/lib/auth'
import { formatRange, groupKindEmoji, startOfDay } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'
import { upcomingBirthdays } from '@/lib/profiles'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Everything the church family does together — the feed, the wall, the help board, prayer, plans and fasts.',
  alternates: { canonical: '/community/hub' },
}

/**
 * The front door to everything in the community section.
 *
 * A single feed cannot carry eleven different things, so this is the map. Cards
 * that need an account say so rather than bouncing a guest into a login screen
 * they did not ask for.
 */
const places = [
  {
    href: '/community',
    emoji: '💬',
    title: 'The feed',
    hint: 'What the church family is sharing today.',
    guest: true,
  },
  {
    href: '/community/encouragement',
    emoji: '💛',
    title: 'Encouragement wall',
    hint: 'Thank somebody out loud, where they can see it.',
    guest: true,
  },
  {
    href: '/community/verse',
    emoji: '📖',
    title: 'Verse of the day',
    hint: 'One verse each morning, and what it said to us.',
    guest: true,
  },
  {
    href: '/community/growing',
    emoji: '🌱',
    title: 'Growing together',
    hint: 'Reading plans, fasts and challenges we do as a church.',
    guest: true,
  },
  {
    href: '/community/challenge',
    emoji: '🎯',
    title: 'This week’s challenge',
    hint: 'One small thing, done on purpose.',
    guest: true,
  },
  {
    href: '/community/worship',
    emoji: '🎵',
    title: 'Worship we love',
    hint: 'The song that carried you this week.',
    guest: true,
  },
  {
    href: '/community/directory',
    emoji: '👥',
    title: 'Member directory',
    hint: 'Find people by gift, skill, area or ministry.',
    guest: false,
  },
  {
    href: '/community/help',
    emoji: '🤝',
    title: 'Help board',
    hint: 'Ask for a hand, or offer one. Always free.',
    guest: false,
  },
  {
    href: '/community/groups',
    emoji: '🏠',
    title: 'Groups',
    hint: 'Small groups, neighbours, interests and services.',
    guest: false,
  },
  {
    href: '/community/care',
    emoji: '🔒',
    title: 'Ask an elder',
    hint: 'A private line to the pastors. Anonymous if you want.',
    guest: false,
  },
  {
    href: '/prayer',
    emoji: '🙏',
    title: 'Prayer wall',
    hint: 'Ask for prayer, and pray for others.',
    guest: true,
  },
  {
    href: '/community/profile',
    emoji: '⚙️',
    title: 'Your profile',
    hint: 'What people can see, and what stays private.',
    guest: false,
  },
]

export default async function CommunityHubPage() {
  const session = await auth()
  const signedIn = Boolean(session?.user)
  const today = startOfDay()

  const [verse, challenge, birthdays, groupCounts] = await Promise.all([
    prisma
      ? prisma.dailyVerse
          .findFirst({ where: { showOn: { lte: today } }, orderBy: { showOn: 'desc' } })
          .catch(() => null)
      : Promise.resolve(null),
    prisma
      ? prisma.initiative
          .findFirst({
            where: { kind: InitiativeKind.CHALLENGE, isActive: true },
            orderBy: { startsOn: 'desc' },
            select: { slug: true, title: true, startsOn: true, endsOn: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    signedIn ? upcomingBirthdays(14) : Promise.resolve([]),
    prisma
      ? prisma.smallGroup
          .groupBy({
            by: ['kind'],
            where: { isActive: true, inviteOnly: false },
            _count: { _all: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ])

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Community"
        subtitle="Everything we do together between Sundays — in one place."
        photo="together"
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-20 pt-4">
        {verse && (
          <section className="rounded-3xl border-2 border-accent/25 bg-accent-soft/60 p-7 sm:p-9">
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-accent-ink">
              Verse of the day
            </p>
            <blockquote className="mt-4">
              <p className="text-pretty font-display text-xl font-bold leading-snug text-foreground sm:text-2xl">
                “{verse.text}”
              </p>
              <footer className="mt-3 font-display font-bold text-accent-ink">
                {verse.reference}
              </footer>
            </blockquote>
            <Link
              href="/community/verse"
              className="mt-6 inline-flex items-center gap-2 font-semibold text-primary hover:underline"
            >
              Share what it said to you
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </section>
        )}

        <section aria-labelledby="places" className="mt-14">
          <h2 id="places" className="text-2xl sm:text-3xl">
            Where would you like to go?
          </h2>

          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4">
            {places.map((place) => {
              const locked = !place.guest && !signedIn

              return (
                <li key={place.href}>
                  <Link
                    href={locked ? `/login?callbackUrl=${encodeURIComponent(place.href)}` : place.href}
                    className="group flex h-full flex-col rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
                  >
                    <span aria-hidden className="text-3xl">
                      {place.emoji}
                    </span>
                    <span className="mt-4 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                      {place.title}
                      <ArrowRight
                        className="size-4 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-1 text-pretty text-muted-foreground">{place.hint}</span>
                    {locked && (
                      <span className="mt-3 w-fit rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Members only
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {challenge && (
            <section className="rounded-3xl bg-royal-gradient p-7 text-white sm:p-9">
              <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-accent">
                This week’s challenge
              </p>
              <h2 className="mt-3 font-display text-2xl font-extrabold">{challenge.title}</h2>
              <p className="mt-2 text-white/70">
                {formatRange(challenge.startsOn, challenge.endsOn)}
              </p>
              <Link
                href={`/community/growing/${challenge.slug}`}
                className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-accent-gradient px-6 font-display font-semibold text-accent-foreground transition-all hover:brightness-105"
              >
                Take it on
              </Link>
            </section>
          )}

          {birthdays.length > 0 && (
            <section className="rounded-3xl border-2 border-border bg-card p-7 shadow-soft sm:p-9">
              <h2 className="flex items-center gap-2 text-xl">
                <Cake className="size-5 text-primary" aria-hidden />
                Birthdays coming up
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Only people who chose to share theirs. Send a word — it costs nothing.
              </p>
              <ul className="mt-5 space-y-3">
                {birthdays.slice(0, 6).map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-4">
                    <Link
                      href={`/community/members/${person.id}`}
                      className="font-display font-bold text-foreground hover:text-primary"
                    >
                      {person.name}
                    </Link>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {person.inDays === 0
                        ? 'Today 🎉'
                        : person.inDays === 1
                          ? 'Tomorrow'
                          : person.label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {groupCounts.length > 0 && (
          <section aria-labelledby="groups" className="mt-14">
            <h2 id="groups" className="text-2xl sm:text-3xl">
              Find your people
            </h2>
            <ul className="mt-6 flex flex-wrap gap-3">
              {groupCounts.map((row) => (
                <li key={row.kind}>
                  <Link
                    href={`/community/groups?kind=${row.kind}`}
                    className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-border bg-card px-5 font-semibold text-foreground transition-colors hover:border-primary/30"
                  >
                    <span aria-hidden>{groupKindEmoji[row.kind]}</span>
                    {row._count._all} {row._count._all === 1 ? 'group' : 'groups'}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
