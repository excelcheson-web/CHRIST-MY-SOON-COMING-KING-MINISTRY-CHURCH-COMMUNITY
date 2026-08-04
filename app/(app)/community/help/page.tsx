import type { Metadata } from 'next'

import { HelpBoard, type HelpItem } from '@/components/community/help-board'
import { PageHero } from '@/components/page-hero'
import { requireUser } from '@/lib/auth'
import { canModerateCommunity } from '@/lib/community'
import { helpBoardWhere } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Help board',
  robots: { index: false, follow: false },
}

export default async function HelpPage() {
  const user = await requireUser('/community/help')

  const records = prisma
    ? await prisma.helpPost
        .findMany({
          where: helpBoardWhere({}),
          orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
          take: 60,
          select: {
            id: true,
            kind: true,
            category: true,
            title: true,
            body: true,
            timeframe: true,
            area: true,
            status: true,
            createdAt: true,
            authorId: true,
            author: { select: { name: true, image: true } },
            claimedBy: { select: { id: true, name: true } },
            _count: { select: { replies: true } },
          },
        })
        .catch((error) => {
          console.error('[help board]', error)
          return []
        })
    : []

  const items: HelpItem[] = records.map((record) => ({
    id: record.id,
    kind: record.kind,
    category: record.category,
    title: record.title,
    body: record.body,
    timeframe: record.timeframe,
    area: record.area,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    authorId: record.authorId,
    author: record.author,
    claimedBy: record.claimedBy,
    replyCount: record._count.replies,
    isMine: record.authorId === user.id,
  }))

  return (
    <>
      <PageHero
        eyebrow="Church family"
        title="Help board"
        subtitle="Ask for a hand, or offer one. Nobody here should have to carry a heavy week on their own."
        photo="prayer"
        crumbs={[
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="mb-8 rounded-2xl border-2 border-primary/20 bg-primary-soft/60 p-5">
          <p className="text-pretty text-sm text-foreground">
            <strong>This board is for members only</strong> and is never public. Everything offered
            here is free — if anybody ever asks you for money on this board, tell a pastor.
          </p>
        </div>

        <HelpBoard
          initial={items}
          viewerId={user.id}
          canModerate={canModerateCommunity(user.role)}
        />
      </div>
    </>
  )
}
