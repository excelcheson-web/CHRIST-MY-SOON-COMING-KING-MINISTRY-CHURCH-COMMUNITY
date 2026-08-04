import { InitiativeKind } from '@prisma/client'
import { requireUser } from '@/lib/auth'
import { Sprout } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { initiativeCardSelect, toInitiativeCard } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Growing together',
  description:
    'Reading plans, corporate fasts and weekly challenges — things the whole church does together.',
  alternates: { canonical: '/community/growing' },
}

const tabs = [
  { value: 'all', label: 'Everything', emoji: '🌱' },
  { value: 'READING_PLAN', label: 'Reading plans', emoji: '📖' },
  { value: 'FAST', label: 'Fasts', emoji: '🔥' },
  { value: 'CHALLENGE', label: 'Challenges', emoji: '🎯' },
]

export default async function GrowingPage({
  searchParams,
}: {
  searchParams: { kind?: string }
}) {
  // Members only — see the note in app/(public)/community/page.tsx.
  await requireUser('/community/growing')

  const active = tabs.find((tab) => tab.value === searchParams.kind)?.value ?? 'all'

  const records = prisma
    ? await prisma.initiative
        .findMany({
          where: {
            isActive: true,
            ...(active !== 'all' ? { kind: active as InitiativeKind } : {}),
          },
          select: initiativeCardSelect,
          orderBy: [{ isFeatured: 'desc' }, { startsOn: 'desc' }],
          take: 40,
        })
        .catch((error) => {
          console.error('[growing]', error)
          return []
        })
    : []

  const items = records.map(toInitiativeCard)
  const running = items.filter((item) => item.status === 'running')
  const upcoming = items.filter((item) => item.status === 'upcoming')
  const finished = items.filter((item) => item.status === 'finished')

  return (
    <>
      <PageHero
        eyebrow="Together"
        title="Growing together"
        subtitle="Reading plans, fasts and challenges the whole church does at the same time. Nobody has to keep up alone."
        photo="learning"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <nav aria-label="Filter" className="mb-10">
          <ul className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <li key={tab.value}>
                <Link
                  href={tab.value === 'all' ? '/community/growing' : `/community/growing?kind=${tab.value}`}
                  aria-current={active === tab.value ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 font-semibold transition-colors',
                    active === tab.value
                      ? 'border-primary/35 bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                  )}
                >
                  <span aria-hidden>{tab.emoji}</span>
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {items.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <Sprout className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              Nothing running just yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              Reading plans, fasts and challenges will appear here as the church starts them.
            </p>
          </div>
        ) : (
          <div className="space-y-14">
            <Section title="Happening now" items={running} />
            <Section title="Starting soon" items={upcoming} />
            <Section title="Finished" items={finished} muted />
          </div>
        )}
      </div>
    </>
  )
}

function Section({
  title,
  items,
  muted,
}: {
  title: string
  items: ReturnType<typeof toInitiativeCard>[]
  muted?: boolean
}) {
  if (items.length === 0) return null

  return (
    <section>
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/community/growing/${item.slug}`}
              className={cn(
                'flex h-full flex-col rounded-3xl border-2 bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-7',
                muted ? 'border-border opacity-80' : 'border-border',
              )}
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className="text-2xl">
                  {item.emoji}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                  {item.kindLabel}
                </span>
              </span>

              <span className="mt-4 font-display text-xl font-bold text-foreground">
                {item.title}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">{item.dateRange}</span>

              {item.description && (
                <span className="mt-3 line-clamp-3 text-pretty text-muted-foreground">
                  {item.description}
                </span>
              )}

              <span className="mt-auto pt-5 text-sm font-semibold text-primary">
                {item.memberCount} {item.memberCount === 1 ? 'person' : 'people'} taking part ·{' '}
                {item.totalDays} {item.totalDays === 1 ? 'day' : 'days'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
