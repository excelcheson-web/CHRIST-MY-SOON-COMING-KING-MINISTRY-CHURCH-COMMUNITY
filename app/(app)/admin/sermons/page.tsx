import { SermonStatus } from '@prisma/client'
import { BookOpen, Eye, MessageCircleQuestion, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { SeriesManager } from '@/components/sermons/series-manager'
import { YouTubeImport } from '@/components/sermons/youtube-import'
import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { formatDuration, formatSermonDate } from '@/lib/sermons'
import { getSiteSettings, hasSocial } from '@/lib/site-settings'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Sermons',
  robots: { index: false, follow: false },
}

const statusStyles: Record<SermonStatus, string> = {
  DRAFT: 'bg-secondary text-muted-foreground',
  PUBLISHED: 'bg-success/15 text-success',
  ARCHIVED: 'bg-destructive/12 text-destructive',
}

export default async function AdminSermonsPage() {
  const user = await requireUser('/admin/sermons')
  if (!canManageContent(user.role)) redirect('/dashboard?denied=sermons')

  if (!prisma) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Sermons</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const [settings, sermons, series] = await Promise.all([
    getSiteSettings(),
    prisma.sermon.findMany({
      orderBy: { preachedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        slug: true,
        title: true,
        speaker: true,
        preachedAt: true,
        duration: true,
        status: true,
        isFeatured: true,
        viewCount: true,
        videoUrl: true,
        audioUrl: true,
        series: { select: { title: true } },
      },
    }),
    prisma.sermonSeries.findMany({
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        isActive: true,
        _count: { select: { sermons: true } },
      },
    }),
  ])

  const published = sermons.filter((s) => s.status === SermonStatus.PUBLISHED).length
  const totalViews = sermons.reduce((sum, s) => sum + s.viewCount, 0)

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
            <BookOpen className="size-8" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
              Sermon Centre
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl">Sermons</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/questions"
            className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-primary/25 px-5 font-display font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            <MessageCircleQuestion className="size-5" aria-hidden />
            What people are asking
          </Link>
          <Link
            href="/admin/sermons/new"
            className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-5" aria-hidden />
            Add sermon
          </Link>
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Published</CardDescription>
            <CardTitle className="text-4xl">{published}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Series</CardDescription>
            <CardTitle className="text-4xl">{series.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="font-semibold">Total listens</CardDescription>
            <CardTitle className="text-4xl">{totalViews}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Above the series manager: bringing messages in is the first thing a
          pastor does here, and organising them into series comes after. */}
      {hasSocial(settings.socials.youtube) && (
        <div className="mt-12">
          <YouTubeImport defaultSpeaker={settings.name} />
        </div>
      )}

      <SeriesManager series={series} />

      <h2 className="mt-14 text-2xl sm:text-3xl">Every sermon</h2>

      {sermons.length === 0 ? (
        <div className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
          <BookOpen className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <p className="mt-4 font-display text-lg font-bold text-foreground">No sermons yet</p>
          <p className="mt-2 text-muted-foreground">
            Add your first one and it appears on{' '}
            <Link href="/sermons" className="font-semibold text-primary hover:underline">
              /sermons
            </Link>{' '}
            once published.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {sermons.map((sermon) => (
            <li key={sermon.id}>
              <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                          statusStyles[sermon.status],
                        )}
                      >
                        {sermon.status}
                      </span>
                      {sermon.isFeatured && (
                        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                          ⭐ Featured
                        </span>
                      )}
                      {sermon.series && (
                        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          {sermon.series.title}
                        </span>
                      )}
                      {!sermon.videoUrl && !sermon.audioUrl && (
                        <span className="rounded-full bg-destructive/12 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
                          No recording
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 font-display text-xl font-bold text-foreground">
                      {sermon.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sermon.speaker} · {formatSermonDate(sermon.preachedAt)}
                      {formatDuration(sermon.duration) && ` · ${formatDuration(sermon.duration)}`}
                      {sermon.viewCount > 0 && ` · ${sermon.viewCount} listens`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/sermons/${sermon.slug}`}
                      className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border bg-card px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
                    >
                      <Eye className="size-4" aria-hidden />
                      View
                    </Link>
                    <Link
                      href={`/admin/sermons/${sermon.slug}`}
                      className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary/25 bg-card px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
