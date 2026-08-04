
import type { Metadata } from 'next'
import Link from 'next/link'

import { Inbox } from 'lucide-react'
import { PageHero } from '@/components/page-hero'
import { RequestCard } from '@/components/prayer/request-card'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { readActorKey } from '@/lib/guest-session'
import {
  loadPrayedIds,
  loadViewer,
  prayerCardSelect,
  prayerWallWhere,
  toWallCard,
} from '@/lib/prayer'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
import { prayerCategories } from '@/lib/validations'

// Reads cookies (for the guest key) and is viewer-specific, so it is never cached.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Prayer Wall',
  description:
    'Pray for one another. Read what people in our church family are carrying, and let them know you prayed.',
  alternates: { canonical: '/prayer' },
}

const filters = [
  { value: 'all', label: 'Everything', emoji: '🙏' },
  { value: 'HEALING', label: 'Healing', emoji: '🩹' },
  { value: 'FAMILY', label: 'Family', emoji: '👨‍👩‍👧' },
  { value: 'RELATIONSHIPS', label: 'Relationships', emoji: '🤝' },
  { value: 'FINANCES', label: 'Provision', emoji: '🌾' },
  { value: 'GUIDANCE', label: 'Guidance', emoji: '🧭' },
  { value: 'SALVATION', label: 'Salvation', emoji: '❤️' },
  { value: 'THANKSGIVING', label: 'Thanksgiving', emoji: '🎉' },
  { value: 'GENERAL', label: 'General', emoji: '💬' },
]

export default async function PrayerWallPage({
  searchParams,
}: {
  searchParams: { category?: string }
}) {
  const session = await auth()
  const viewer = await loadViewer(session?.user ?? null)
  const actorKey = readActorKey(viewer.id)

  const active = filters.find((filter) => filter.value === searchParams.category)?.value ?? 'all'
  const categoryFilter =
    active !== 'all' && prayerCategories.includes(active as (typeof prayerCategories)[number])
      ? { category: active as (typeof prayerCategories)[number] }
      : {}

  const records = prisma
    ? await prisma.prayerRequest
        .findMany({
          where: { AND: [prayerWallWhere(viewer), categoryFilter] },
          select: prayerCardSelect,
          orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
          take: 40,
        })
        .catch((error) => {
          console.error('[prayer wall]', error)
          return []
        })
    : []

  const prayedIds = await loadPrayedIds(
    actorKey,
    records.map((record) => record.id),
  )
  const requests = records.map((record) => toWallCard(record, { viewerId: viewer.id, prayedIds }))

  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="Prayer Wall"
        subtitle="Nobody here carries anything alone. Read what people are facing, pray, and tell them you did — it matters more than you think."
        photo="prayer"
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-20 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl">
            {requests.length > 0 ? `${requests.length} to pray for` : 'The wall'}
          </h2>
          <Button asChild size="lg">
            <Link href="/prayer/submit">Ask for prayer</Link>
          </Button>
        </div>

        <nav aria-label="Filter by category" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const isActive = active === filter.value
              return (
                <li key={filter.value}>
                  <Link
                    href={filter.value === 'all' ? '/prayer' : `/prayer?category=${filter.value}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 font-semibold transition-colors',
                      isActive
                        ? 'border-primary/35 bg-primary-soft text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                    )}
                  >
                    <span aria-hidden>{filter.emoji}</span>
                    {filter.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {requests.length === 0 ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <Inbox className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              {active === 'all' ? 'The wall is quiet right now' : 'Nothing in this category yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              Be the first to share something. Whatever you are carrying, this church family would
              count it a privilege to pray.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/prayer/submit">Ask for prayer</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {requests.map((request) => (
              <li key={request.id}>
                <RequestCard request={request} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
