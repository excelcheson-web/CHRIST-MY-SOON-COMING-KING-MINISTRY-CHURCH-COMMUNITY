import { Clock, Globe, Lock, Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Prayer Groups',
  description: 'Join a group of people who pray together regularly.',
  alternates: { canonical: '/prayer/groups' },
}

export default async function PrayerGroupsPage() {
  const session = await auth()

  const groups = prisma
    ? await prisma.prayerGroup
        .findMany({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            meetingTime: true,
            isOnline: true,
            isPublic: true,
            leader: { select: { name: true } },
            _count: { select: { members: true } },
            members: session?.user
              ? { where: { userId: session.user.id }, select: { id: true } }
              : false,
          },
        })
        .catch((error) => {
          console.error('[prayer groups]', error)
          return []
        })
    : []

  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="Prayer Groups"
        subtitle="Praying with other people changes both the praying and the pray-er. Find a group and join in — everyone is welcome."
        photo="together"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/prayer', label: 'Prayer' },
        ]}
      />

      <div className="container pb-20 pt-4">
        {groups.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <Users className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              No prayer groups yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              Our prayer team is setting these up. In the meantime, the{' '}
              <Link href="/prayer" className="font-semibold text-primary hover:underline">
                prayer wall
              </Link>{' '}
              is open to everyone.
            </p>
          </div>
        ) : (
          <ul className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {groups.map((group) => {
              const isMember = Array.isArray(group.members) && group.members.length > 0

              return (
                <li key={group.id}>
                  <article className="flex h-full flex-col rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:border-primary/30 hover:shadow-lifted sm:p-8">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
                        <Users className="size-7" aria-hidden />
                      </span>
                      <span className="flex flex-wrap justify-end gap-2">
                        {isMember && (
                          <span className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-success">
                            You are in
                          </span>
                        )}
                        {!group.isPublic && (
                          <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            <Lock className="size-3" aria-hidden />
                            Invite only
                          </span>
                        )}
                      </span>
                    </div>

                    <h2 className="mt-5 text-2xl">
                      <Link
                        href={`/prayer/groups/${group.slug}`}
                        className="rounded transition-colors hover:text-primary"
                      >
                        {group.name}
                      </Link>
                    </h2>

                    {group.description && (
                      <p className="mt-3 flex-1 text-pretty text-muted-foreground">
                        {group.description}
                      </p>
                    )}

                    <dl className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-5 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-accent-ink" aria-hidden />
                        <dt className="sr-only">Members</dt>
                        <dd className="font-semibold text-foreground">
                          {group._count.members}{' '}
                          {group._count.members === 1 ? 'member' : 'members'}
                        </dd>
                      </div>

                      {group.meetingTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-accent-ink" aria-hidden />
                          <dt className="sr-only">Meets</dt>
                          <dd className="font-semibold text-foreground">{group.meetingTime}</dd>
                        </div>
                      )}

                      {group.isOnline && (
                        <div className="flex items-center gap-2">
                          <Globe className="size-4 text-accent-ink" aria-hidden />
                          <dt className="sr-only">Where</dt>
                          <dd className="font-semibold text-foreground">Online</dd>
                        </div>
                      )}
                    </dl>

                    {group.leader && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Led by {group.leader.name}
                      </p>
                    )}
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
