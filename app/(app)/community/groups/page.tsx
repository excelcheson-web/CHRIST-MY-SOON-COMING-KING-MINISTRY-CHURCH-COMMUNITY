import { GroupKind } from '@prisma/client'
import { Lock, MapPin, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { requireUser } from '@/lib/auth'
import { groupKindEmoji, groupKindHints, groupKindLabels, groupListWhere } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Groups',
  robots: { index: false, follow: false },
}

const tabs: { value: string; label: string; emoji: string }[] = [
  { value: 'all', label: 'All groups', emoji: '👥' },
  ...(
    ['SMALL_GROUP', 'NEIGHBOURHOOD', 'INTEREST', 'SERVICE_TIME', 'SUPPORT'] as GroupKind[]
  ).map((kind) => ({
    value: kind,
    label: groupKindLabels[kind],
    emoji: groupKindEmoji[kind],
  })),
]

export default async function GroupsPage({ searchParams }: { searchParams: { kind?: string } }) {
  const user = await requireUser('/community/groups')
  const active = tabs.find((tab) => tab.value === searchParams.kind)?.value ?? 'all'

  const myGroupIds = prisma
    ? (
        await prisma.smallGroupMember
          .findMany({ where: { userId: user.id }, select: { groupId: true } })
          .catch(() => [])
      ).map((row) => row.groupId)
    : []

  const groups = prisma
    ? await prisma.smallGroup
        .findMany({
          where: {
            AND: [
              groupListWhere({ id: user.id, role: user.role, groupIds: myGroupIds }),
              active !== 'all' ? { kind: active as GroupKind } : {},
            ],
          },
          orderBy: [{ kind: 'asc' }, { name: 'asc' }],
          take: 60,
          select: {
            id: true,
            slug: true,
            name: true,
            kind: true,
            description: true,
            meetingTime: true,
            location: true,
            isOnline: true,
            inviteOnly: true,
            allowAnonymous: true,
            capacity: true,
            _count: { select: { members: true } },
          },
        })
        .catch((error) => {
          console.error('[groups]', error)
          return []
        })
    : []

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Groups"
        subtitle="Small groups, neighbours, shared interests, and the people at your service. Twelve people who know your name beats a thousand who do not."
        photo="together"
        crumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <nav aria-label="Filter groups" className="mb-10">
          <ul className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <li key={tab.value}>
                <Link
                  href={tab.value === 'all' ? '/community/groups' : `/community/groups?kind=${tab.value}`}
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

        {active !== 'all' && (
          <p className="mb-8 text-pretty text-muted-foreground">
            {groupKindHints[active as GroupKind]}
          </p>
        )}

        {groups.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <Users className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">No groups here yet</p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              Ask a pastor about starting one — a neighbourhood group needs nothing more than two
              people and a kettle.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const mine = myGroupIds.includes(group.id)
              const full = group.capacity !== null && group._count.members >= group.capacity

              return (
                <li key={group.id}>
                  <article
                    className={cn(
                      'flex h-full flex-col rounded-3xl border-2 bg-card p-6 shadow-soft',
                      mine ? 'border-primary/35' : 'border-border',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                        {groupKindEmoji[group.kind]} {groupKindLabels[group.kind]}
                      </span>
                      {mine && (
                        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          You are in this
                        </span>
                      )}
                      {group.inviteOnly && (
                        <span className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                          <Lock className="size-3" aria-hidden />
                          Private
                        </span>
                      )}
                    </div>

                    <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                      {group.name}
                    </h2>

                    {group.description && (
                      <p className="mt-2 text-pretty text-muted-foreground">{group.description}</p>
                    )}

                    <dl className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                      {group.meetingTime && (
                        <div>
                          <dt className="inline font-semibold">Meets: </dt>
                          <dd className="inline">{group.meetingTime}</dd>
                        </div>
                      )}
                      {(group.location || group.isOnline) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-4" aria-hidden />
                          <dt className="sr-only">Where</dt>
                          <dd>{group.isOnline ? 'Online' : group.location}</dd>
                        </div>
                      )}
                    </dl>

                    {group.allowAnonymous && (
                      <p className="mt-4 rounded-xl bg-secondary/60 p-3 text-sm text-muted-foreground">
                        You can post here without your name showing. Only the group&rsquo;s leader
                        can see who wrote what.
                      </p>
                    )}

                    <p className="mt-auto pt-5 text-sm font-semibold text-primary">
                      {group._count.members}{' '}
                      {group._count.members === 1 ? 'member' : 'members'}
                      {full && ' · full'}
                    </p>
                  </article>
                </li>
              )
            })}
          </ul>
        )}

        <p className="mt-10 text-pretty text-muted-foreground">
          Want to join one? Speak to a pastor or your group leader — memberships are set by hand
          for now, so nobody lands in a support group by accident.
        </p>
      </div>
    </>
  )
}
