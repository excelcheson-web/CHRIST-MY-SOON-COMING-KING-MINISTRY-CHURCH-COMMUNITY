import type { Metadata } from 'next'

import { Feed } from '@/components/community/feed'
import { PageHero } from '@/components/page-hero'
import { auth } from '@/lib/auth'
import {
  canModerateCommunity,
  loadCommunityViewer,
  loadLikedIds,
  loadReactions,
  loadVotes,
  postCardSelect,
  postFeedWhere,
  toFeedPost,
} from '@/lib/community'
import { prisma } from '@/lib/prisma'

// Viewer-specific: what is in the feed depends entirely on who is asking.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community',
  description:
    'Share what God is doing, ask for prayer, encourage one another. A place for our church family to talk between Sundays.',
  alternates: { canonical: '/community' },
}

const PAGE_SIZE = 20

export default async function CommunityPage() {
  const session = await auth()
  const viewer = await loadCommunityViewer(session?.user)

  const records = prisma
    ? await prisma.post
        .findMany({
          where: postFeedWhere(viewer),
          select: postCardSelect,
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: PAGE_SIZE + 1,
        })
        .catch((error) => {
          console.error('[community]', error)
          return []
        })
    : []

  const page = records.slice(0, PAGE_SIZE)
  const postIds = page.map((record) => record.id)
  const [likedIds, reactions, votedOptionIds] = await Promise.all([
    loadLikedIds(viewer.id, postIds),
    loadReactions(viewer.id, postIds),
    loadVotes(viewer.id, postIds),
  ])

  /*
   * Only the viewer's own ministries and groups are offered in the composer.
   * The API re-checks membership anyway, but a dropdown listing groups someone
   * cannot post to is a bug waiting to be reported as one.
   */
  const [ministries, smallGroups] =
    prisma && viewer.id
      ? await Promise.all([
          prisma.ministry
            .findMany({
              where: { id: { in: viewer.ministryIds }, isActive: true },
              orderBy: { name: 'asc' },
              select: { id: true, name: true },
            })
            .catch(() => []),
          prisma.smallGroup
            .findMany({
              where: { id: { in: viewer.smallGroupIds }, isActive: true },
              orderBy: { name: 'asc' },
              select: { id: true, name: true },
            })
            .catch(() => []),
        ])
      : [[], []]

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Community"
        subtitle="The conversation between Sundays. Share a testimony, ask for prayer, or just encourage somebody who needs it today."
        photo="together"
        crumbs={[{ href: '/', label: 'Home' }]}
      />

      <div className="container pb-20 pt-4">
        <Feed
          initial={{
            posts: page.map((record) =>
              toFeedPost(record, { viewer, likedIds, reactions, votedOptionIds }),
            ),
            nextCursor: records.length > PAGE_SIZE ? (page.at(-1)?.id ?? null) : null,
          }}
          signedIn={Boolean(viewer.id)}
          canModerate={canModerateCommunity(viewer.role)}
          ministries={ministries}
          smallGroups={smallGroups}
        />
      </div>
    </>
  )
}
