import { ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { ModerationRow, type ReportedPost } from '@/components/community/moderation-row'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canModerateCommunity } from '@/lib/community'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community moderation',
  robots: { index: false, follow: false },
}

export default async function AdminCommunityPage() {
  const user = await requireUser('/admin/community')
  if (!canModerateCommunity(user.role)) redirect('/dashboard?denied=community')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Community</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const [flagged, totals] = await Promise.all([
    prisma.post.findMany({
      where: { reports: { some: { status: 'PENDING' } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        body: true,
        createdAt: true,
        deletedAt: true,
        author: { select: { name: true } },
        reports: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reason: true,
            createdAt: true,
            reportedBy: { select: { name: true } },
          },
        },
      },
    }),
    prisma.post.aggregate({
      _count: { _all: true },
      where: { deletedAt: null },
    }),
  ])

  const posts: ReportedPost[] = flagged.map((post) => ({
    id: post.id,
    body: post.body,
    authorName: post.author.name,
    createdAt: post.createdAt.toISOString(),
    removed: post.deletedAt !== null,
    reports: post.reports.map((report) => ({
      id: report.id,
      reason: report.reason,
      reportedBy: report.reportedBy.name,
      createdAt: report.createdAt.toISOString(),
    })),
  }))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <ShieldCheck className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Church family
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Community moderation</h1>
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Waiting for you</CardDescription>
            <CardTitle className="text-4xl">{posts.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Posts in the feed</CardDescription>
            <CardTitle className="text-4xl">{totals._count._all}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <h2 className="mt-14 text-2xl sm:text-3xl">Reported posts</h2>

      {posts.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <ShieldCheck className="mx-auto size-10 text-success" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">Nothing to review</p>
          <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
            Nobody has reported anything. When they do, it will appear here with what they said was
            wrong.
          </p>
          <Link
            href="/community"
            className="mt-7 inline-flex min-h-12 items-center rounded-xl border-2 border-primary/25 px-6 font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            Go to the feed
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-5">
          {posts.map((post) => (
            <li key={post.id}>
              <ModerationRow post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
