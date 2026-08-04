import { Clock, Globe, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { PageHero } from '@/components/page-hero'
import { GroupBoard, type BoardPost } from '@/components/prayer/group-board'
import { JoinGroupButton } from '@/components/prayer/join-button'
import { RequestCard } from '@/components/prayer/request-card'
import { auth } from '@/lib/auth'
import { readActorKey } from '@/lib/guest-session'
import { canModeratePrayer } from '@/lib/permissions'
import { loadPrayedIds, prayerCardSelect, toWallCard } from '@/lib/prayer'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  if (!prisma) return { title: 'Prayer group' }

  const group = await prisma.prayerGroup
    .findUnique({ where: { slug: params.slug }, select: { name: true, description: true } })
    .catch(() => null)

  if (!group) return { title: 'Prayer group not found' }
  return {
    title: group.name,
    description: group.description ?? 'A group that prays together.',
    robots: { index: false, follow: true },
  }
}

export default async function PrayerGroupPage({ params }: { params: { slug: string } }) {
  if (!prisma) notFound()

  const session = await auth()
  const viewerId = session?.user?.id

  const group = await prisma.prayerGroup
    .findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        meetingTime: true,
        isOnline: true,
        isPublic: true,
        isActive: true,
        shareRequests: true,
        leader: { select: { name: true } },
        _count: { select: { members: true } },
      },
    })
    .catch(() => null)

  if (!group || !group.isActive) notFound()

  const membership = viewerId
    ? await prisma.prayerGroupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: viewerId } },
        select: { id: true },
      })
    : null

  const isMember = Boolean(membership)
  // Leaders and the prayer team can read a board they have not joined.
  const canRead = isMember || canModeratePrayer(session?.user?.role)

  const [posts, requestRecords] = canRead
    ? await Promise.all([
        prisma.prayerGroupPost.findMany({
          where: { groupId: group.id, hidden: false },
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: 50,
          select: {
            id: true,
            content: true,
            pinned: true,
            createdAt: true,
            author: { select: { name: true } },
          },
        }),
        group.shareRequests
          ? prisma.prayerRequest.findMany({
              where: { groupId: group.id, status: { in: ['ACTIVE', 'ANSWERED'] } },
              select: prayerCardSelect,
              orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
              take: 20,
            })
          : Promise.resolve([]),
      ])
    : [[], []]

  const prayedIds = await loadPrayedIds(
    readActorKey(viewerId),
    requestRecords.map((record) => record.id),
  )

  const boardPosts: BoardPost[] = posts.map((post) => ({
    id: post.id,
    authorName: post.author.name,
    content: post.content,
    pinned: post.pinned,
    createdAt: post.createdAt.toISOString(),
  }))

  return (
    <>
      <PageHero
        eyebrow="Prayer group"
        title={group.name}
        subtitle={group.description ?? undefined}
        emoji="👥"
        crumbs={[
          { href: '/prayer', label: 'Prayer' },
          { href: '/prayer/groups', label: 'Groups' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-accent-ink" aria-hidden />
              <dt className="sr-only">Members</dt>
              <dd className="font-semibold text-foreground">
                {group._count.members} {group._count.members === 1 ? 'member' : 'members'}
              </dd>
            </div>
            {group.meetingTime && (
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-accent-ink" aria-hidden />
                <dt className="sr-only">Meets</dt>
                <dd className="font-semibold text-foreground">{group.meetingTime}</dd>
              </div>
            )}
            {group.isOnline && (
              <div className="flex items-center gap-2">
                <Globe className="size-5 text-accent-ink" aria-hidden />
                <dt className="sr-only">Where</dt>
                <dd className="font-semibold text-foreground">Meets online</dd>
              </div>
            )}
          </dl>

          <JoinGroupButton slug={group.slug} isMember={isMember} isPublic={group.isPublic} />
        </div>

        {canRead && group.shareRequests && requestRecords.length > 0 && (
          <section aria-labelledby="group-requests" className="mt-12">
            <h2 id="group-requests" className="text-2xl sm:text-3xl">
              Shared with this group
            </h2>
            <ul className="mt-6 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
              {requestRecords.map((record) => (
                <li key={record.id}>
                  <RequestCard request={toWallCard(record, { viewerId, prayedIds })} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <GroupBoard slug={group.slug} posts={boardPosts} canPost={canRead} />
      </div>
    </>
  )
}
