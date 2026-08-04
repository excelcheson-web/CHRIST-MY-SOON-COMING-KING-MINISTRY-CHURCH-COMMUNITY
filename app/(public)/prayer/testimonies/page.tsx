import { ApprovalStatus } from '@prisma/client'
import { PartyPopper } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHero } from '@/components/page-hero'
import { TestimonyCard, type TestimonyCardData } from '@/components/prayer/testimony-card'
import { Button } from '@/components/ui/button'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Testimonies',
  description: 'Answered prayers and God stories from our church family.',
  alternates: { canonical: '/prayer/testimonies' },
}

export default async function TestimoniesPage() {
  const session = await auth()
  const viewerId = session?.user?.id

  const records = prisma
    ? await prisma.testimony
        .findMany({
          where: { status: ApprovalStatus.APPROVED },
          orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
          take: 30,
          select: {
            id: true,
            title: true,
            content: true,
            category: true,
            likeCount: true,
            isFeatured: true,
            createdAt: true,
            anonymous: true,
            guestName: true,
            author: { select: { name: true } },
            likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
            comments: {
              where: { hidden: false },
              orderBy: { createdAt: 'asc' },
              take: 20,
              select: {
                id: true,
                content: true,
                createdAt: true,
                author: { select: { name: true } },
              },
            },
          },
        })
        .catch((error) => {
          console.error('[testimonies]', error)
          return []
        })
    : []

  const testimonies: TestimonyCardData[] = records.map((record) => ({
    id: record.id,
    title: record.title,
    content: record.content,
    category: record.category,
    // Anonymity resolved server-side; the author's name never reaches the browser.
    authorName: record.anonymous
      ? 'Anonymous'
      : (record.author?.name ?? record.guestName ?? 'A friend'),
    likeCount: record.likeCount,
    isFeatured: record.isFeatured,
    createdAt: record.createdAt.toISOString(),
    likedByMe: Array.isArray(record.likes) && record.likes.length > 0,
    comments: record.comments.map((comment) => ({
      id: comment.id,
      authorName: comment.author.name,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    })),
  }))

  return (
    <>
      <PageHero
        eyebrow="Prayer Portal"
        title="Testimonies"
        subtitle="God is still answering. These are real stories from real people in this family — read them when your own faith needs a lift."
        photo="worship"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/prayer', label: 'Prayer' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl">
            {testimonies.length > 0 ? `${testimonies.length} God stories` : 'God stories'}
          </h2>
          <Button asChild size="lg">
            <Link href="/prayer/testimonies/share">Share your story</Link>
          </Button>
        </div>

        {testimonies.length === 0 ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <PartyPopper className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              No stories published yet
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              Has God done something in your life? However small it seems, somebody here needs to
              hear it. Be the first.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link href="/prayer/testimonies/share">Share your story</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 space-y-6">
            {testimonies.map((testimony) => (
              <li key={testimony.id}>
                <TestimonyCard testimony={testimony} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
