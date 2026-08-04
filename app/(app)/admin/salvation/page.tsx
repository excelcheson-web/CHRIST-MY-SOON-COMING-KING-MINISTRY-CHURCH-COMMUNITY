import { FollowUpStatus, Role } from '@prisma/client'
import { HeartHandshake, Inbox } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { DecisionRow, type DecisionSummary, type TeamMember } from '@/components/admin/decision-row'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireFollowUpAccess } from '@/lib/auth'
import { followUpRoles } from '@/lib/permissions'
import { isDatabaseConfigured, prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Salvation decisions',
  robots: { index: false, follow: false },
}

const filters = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Needs contact' },
  { key: 'CONTACTED', label: 'Contacted' },
  { key: 'MEETING_SET', label: 'Meeting set' },
  { key: 'DISCIPLESHIP_STARTED', label: 'In discipleship' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'LOST_CONTACT', label: 'Lost contact' },
] as const

export default async function AdminSalvationPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const user = await requireFollowUpAccess()

  // Volunteers see their own caseload; pastors and admins see the whole board.
  const onlyMine = user.role === Role.FOLLOW_UP_TEAM
  const statusFilter = filters.find((filter) => filter.key === searchParams.status)?.key

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Salvation decisions</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet, so there is nothing to show. Add a <code>DATABASE_URL</code>{' '}
          and run <code>npm run db:migrate</code> to switch this on.
        </Alert>
      </div>
    )
  }

  const where = {
    ...(onlyMine ? { assignedToId: user.id } : {}),
    ...(statusFilter && statusFilter !== 'all'
      ? { followUpStatus: statusFilter as FollowUpStatus }
      : {}),
  }

  const [decisions, counts, team] = await Promise.all([
    prisma.salvationDecision.findMany({
      where: { ...where, stepContact: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { assignedTo: { select: { name: true } } },
    }),
    prisma.salvationDecision.groupBy({
      by: ['followUpStatus'],
      where: onlyMine ? { assignedToId: user.id, stepContact: true } : { stepContact: true },
      _count: { _all: true },
    }),
    // Only the people who can reassign need the team list.
    !onlyMine
      ? prisma.user.findMany({
          where: { role: { in: followUpRoles }, availableForFollowUp: true },
          select: { id: true, name: true, role: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([] as TeamMember[]),
  ])

  const totalContacted = counts.reduce((sum, row) => sum + row._count._all, 0)
  const pending = counts.find((row) => row.followUpStatus === FollowUpStatus.PENDING)?._count._all ?? 0
  const inDiscipleship =
    counts.find((row) => row.followUpStatus === FollowUpStatus.DISCIPLESHIP_STARTED)?._count._all ?? 0

  const rows: DecisionSummary[] = decisions.map((decision) => ({
    id: decision.id,
    firstName: decision.firstName,
    lastName: decision.lastName,
    email: decision.email,
    phone: decision.phone,
    decision: decision.decision,
    followUpStatus: decision.followUpStatus,
    notes: decision.notes,
    createdAt: decision.createdAt.toISOString(),
    assignedToName: decision.assignedTo?.name ?? null,
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <HeartHandshake className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            {onlyMine ? 'Your caseload' : 'Follow-up board'}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Salvation decisions</h1>
        </div>
      </div>

      {!isDatabaseConfigured && (
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">People who left details</CardDescription>
            <CardTitle className="text-4xl">{totalContacted}</CardTitle>
          </CardHeader>
        </Card>
        <Card className={pending > 0 ? 'border-accent/40 bg-accent-soft/40' : undefined}>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Waiting to be contacted</CardDescription>
            <CardTitle className="text-4xl">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Now in discipleship</CardDescription>
            <CardTitle className="text-4xl">{inDiscipleship}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <nav aria-label="Filter by status" className="mt-10">
        <ul className="flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = (searchParams.status ?? 'all') === filter.key
            return (
              <li key={filter.key}>
                <Link
                  href={filter.key === 'all' ? '/admin/salvation' : `/admin/salvation?status=${filter.key}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-xl border-2 px-4 font-semibold transition-colors',
                    active
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
          <p className="mt-4 font-display text-lg font-bold text-foreground">Nothing here yet</p>
          <p className="mt-2 text-muted-foreground">
            Decisions appear here as soon as someone completes the journey at{' '}
            <Link href="/salvation" className="font-semibold text-primary hover:underline">
              /salvation
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="mt-10 space-y-5">
          {rows.map((decision) => (
            <li key={decision.id}>
              <DecisionRow decision={decision} team={team} canAssign={!onlyMine} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
