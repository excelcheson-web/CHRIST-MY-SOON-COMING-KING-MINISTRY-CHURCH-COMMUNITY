import { PrayerStatus, PrayerUrgency, PrayerVisibility } from '@prisma/client'
import { HandHeart, Inbox } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PrayerRow, type AdminPrayerRow } from '@/components/admin/prayer-row'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { readActorKey } from '@/lib/guest-session'
import { canModeratePrayer } from '@/lib/permissions'
import { loadPrayedIds } from '@/lib/prayer'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Prayer team',
  robots: { index: false, follow: false },
}

const filters = [
  { key: 'urgent', label: 'Urgent first' },
  { key: 'all', label: 'All active' },
  { key: 'private', label: 'Private' },
  { key: 'pastoral', label: 'Needs a pastor' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'answered', label: 'Answered' },
] as const

type FilterKey = (typeof filters)[number]['key']

function whereFor(filter: FilterKey) {
  switch (filter) {
    case 'private':
      return { visibility: PrayerVisibility.PRIVATE, status: PrayerStatus.ACTIVE }
    case 'pastoral':
      return { needsPastoralFollowUp: true }
    case 'flagged':
      return { flagged: true }
    case 'answered':
      return { status: PrayerStatus.ANSWERED }
    case 'urgent':
      return {
        status: PrayerStatus.ACTIVE,
        urgency: { in: [PrayerUrgency.HIGH, PrayerUrgency.URGENT] },
      }
    default:
      return { status: PrayerStatus.ACTIVE }
  }
}

export default async function AdminPrayerPage({
  searchParams,
}: {
  searchParams: { filter?: string }
}) {
  const user = await requireUser('/admin/prayer')
  // Guarded here as well as in middleware — PRIVATE requests are on this page.
  if (!canModeratePrayer(user.role)) redirect('/dashboard?denied=prayer')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Prayer team</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet, so there is nothing to show. Add a <code>DATABASE_URL</code>{' '}
          and run <code>npm run db:migrate</code> to switch this on.
        </Alert>
      </div>
    )
  }

  const active = (filters.find((f) => f.key === searchParams.filter)?.key ?? 'urgent') as FilterKey

  const [records, counts] = await Promise.all([
    prisma.prayerRequest.findMany({
      where: whereFor(active),
      orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        urgency: true,
        visibility: true,
        status: true,
        anonymous: true,
        prayerCount: true,
        answerNote: true,
        flagged: true,
        needsPastoralFollowUp: true,
        createdAt: true,
        guestName: true,
        guestEmail: true,
        author: { select: { name: true, email: true } },
        _count: { select: { responses: true } },
      },
    }),
    Promise.all([
      prisma.prayerRequest.count({ where: { status: PrayerStatus.ACTIVE } }),
      prisma.prayerRequest.count({
        where: {
          status: PrayerStatus.ACTIVE,
          urgency: { in: [PrayerUrgency.HIGH, PrayerUrgency.URGENT] },
        },
      }),
      prisma.prayerRequest.count({ where: { needsPastoralFollowUp: true } }),
      prisma.prayerRequest.count({ where: { status: PrayerStatus.ANSWERED } }),
    ]),
  ])

  const [activeCount, urgentCount, pastoralCount, answeredCount] = counts

  const prayedIds = await loadPrayedIds(
    readActorKey(user.id),
    records.map((record) => record.id),
  )

  const rows: AdminPrayerRow[] = records.map((record) => ({
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    urgency: record.urgency,
    visibility: record.visibility,
    status: record.status,
    anonymous: record.anonymous,
    // The team needs the real name to pray by name and to follow up; anonymity
    // hides it from the public wall, not from the people doing the praying.
    authorName: record.author?.name ?? record.guestName ?? 'Anonymous visitor',
    contactEmail: record.author?.email ?? record.guestEmail,
    prayerCount: record.prayerCount,
    responseCount: record._count.responses,
    answerNote: record.answerNote,
    flagged: record.flagged,
    needsPastoralFollowUp: record.needsPastoralFollowUp,
    createdAt: record.createdAt.toISOString(),
    hasPrayed: prayedIds.has(record.id),
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <HandHeart className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Intercessors
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Prayer team</h1>
        </div>
      </div>

      <Alert variant="info" className="mt-8">
        Some of these are marked <strong>Private</strong>. People wrote them because a small,
        trusted group would read them — please keep it that way.
      </Alert>

      <div className="mt-8 grid gap-5 sm:grid-cols-4">
        <Card className={urgentCount > 0 ? 'border-destructive/35 bg-destructive/5' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Urgent</CardDescription>
            <CardTitle className="text-4xl">{urgentCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Active requests</CardDescription>
            <CardTitle className="text-4xl">{activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pastoralCount > 0 ? 'border-accent/40 bg-accent-soft/40' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Needs a pastor</CardDescription>
            <CardTitle className="text-4xl">{pastoralCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Answered</CardDescription>
            <CardTitle className="text-4xl">{answeredCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <nav aria-label="Filter requests" className="mt-10">
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const isActive = active === filter.key
            return (
              <li key={filter.key}>
                <Link
                  href={`/admin/prayer?filter=${filter.key}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-xl border-2 px-4 font-semibold transition-colors',
                    isActive
                      ? 'border-primary/35 bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                  )}
                >
                  {filter.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <Inbox className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">Nothing here</p>
          <p className="mt-2 text-muted-foreground">
            Requests appear as soon as someone submits one at{' '}
            <Link href="/prayer/submit" className="font-semibold text-primary hover:underline">
              /prayer/submit
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-5">
          {rows.map((request) => (
            <li key={request.id}>
              <PrayerRow request={request} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
