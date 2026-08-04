import { ArrowLeft, Eye } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { SermonForm } from '@/components/sermons/sermon-form'
import { requireUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit sermon',
  robots: { index: false, follow: false },
}

/** `datetime-local` wants local wall-clock time, not UTC. */
function toLocalInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default async function EditSermonPage({ params }: { params: { slug: string } }) {
  const user = await requireUser(`/admin/sermons/${params.slug}`)
  if (!canManageContent(user.role)) redirect('/dashboard?denied=sermons')
  if (!prisma) notFound()

  const [sermon, series, ministries] = await Promise.all([
    prisma.sermon.findUnique({ where: { slug: params.slug } }).catch(() => null),
    prisma.sermonSeries
      .findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true } })
      .catch(() => []),
    prisma.ministry
      .findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      })
      .catch(() => []),
  ])
  if (!sermon) notFound()

  return (
    <div className="container py-14 sm:py-20">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/sermons"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5" aria-hidden />
          All sermons
        </Link>

        <Link
          href={`/sermons/${sermon.slug}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <Eye className="size-4" aria-hidden />
          View on the site
        </Link>
      </div>

      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl sm:text-4xl">{sermon.title}</h1>
        <p className="mt-3 text-muted-foreground">
          {sermon.viewCount} {sermon.viewCount === 1 ? 'person has' : 'people have'} listened to
          this.
        </p>

        <div className="mt-10">
          <SermonForm
            mode="edit"
            series={series}
            ministries={ministries}
            initial={{
              slug: sermon.slug,
              title: sermon.title,
              description: sermon.description ?? '',
              speaker: sermon.speaker,
              speakerBio: sermon.speakerBio ?? '',
              speakerImage: sermon.speakerImage ?? '',
              seriesId: sermon.seriesId ?? '',
              ministryId: sermon.ministryId ?? '',
              biblePassage: sermon.biblePassage ?? '',
              bibleText: sermon.bibleText ?? '',
              preachedAt: toLocalInput(sermon.preachedAt),
              duration: sermon.duration?.toString() ?? '',
              videoUrl: sermon.videoUrl ?? '',
              audioUrl: sermon.audioUrl ?? '',
              transcript: sermon.transcript ?? '',
              notes: sermon.notes ?? '',
              // The form edits arrays as one-per-line textareas.
              studyQuestions: sermon.studyQuestions.join('\n'),
              topics: sermon.topics.join('\n'),
              tags: sermon.tags.join('\n'),
              image: sermon.image ?? '',
              isFeatured: sermon.isFeatured,
              status: sermon.status,
            }}
          />
        </div>
      </div>
    </div>
  )
}
