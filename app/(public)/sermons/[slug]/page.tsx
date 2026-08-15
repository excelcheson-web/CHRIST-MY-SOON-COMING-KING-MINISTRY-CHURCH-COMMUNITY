import { SermonStatus } from '@prisma/client'
import { CalendarDays, Clock, Eye, FileText, User } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/json-ld'
import { Markdown } from '@/components/markdown'
import { PageHero } from '@/components/page-hero'
import { AskSermon } from '@/components/sermons/ask-sermon'
import { SermonCard } from '@/components/sermons/sermon-card'
import { SermonPlayer } from '@/components/sermons/sermon-player'
import { auth } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import {
  formatDuration,
  formatSermonDate,
  isPlayableAudio,
  sermonCardSelect,
  toEmbed,
  toSermonCard,
} from '@/lib/sermons'
import { breadcrumbSchema, sermonSchema } from '@/lib/seo'
import { getSiteSettings } from '@/lib/site-settings'

export const dynamic = 'force-dynamic'

async function loadSermon(slug: string) {
  if (!prisma) return null
  try {
    return await prisma.sermon.findUnique({
      where: { slug },
      include: { series: { select: { title: true, slug: true } } },
    })
  } catch (error) {
    console.error('[sermon]', error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const sermon = await loadSermon(params.slug)
  if (!sermon || sermon.status !== SermonStatus.PUBLISHED) {
    return { title: 'Sermon', robots: { index: false, follow: false } }
  }

  const description =
    sermon.description ??
    `${sermon.speaker} · ${sermon.biblePassage ?? 'A message'} · ${formatSermonDate(sermon.preachedAt)}`

  return {
    title: sermon.title,
    description,
    // The preacher's name and the passage are what people search for when they
    // half-remember a message, so both are stated rather than left in prose.
    authors: [{ name: sermon.speaker }],
    alternates: { canonical: `/sermons/${sermon.slug}` },
    openGraph: {
      type: 'article',
      title: sermon.title,
      description,
      url: `/sermons/${sermon.slug}`,
      publishedTime: sermon.preachedAt.toISOString(),
      modifiedTime: sermon.updatedAt.toISOString(),
      authors: [sermon.speaker],
      tags: [...sermon.topics, ...sermon.tags],
      images: sermon.image ? [{ url: sermon.image }] : undefined,
    },
  }
}

export default async function SermonPage({ params }: { params: { slug: string } }) {
  const [sermon, session, settings] = await Promise.all([
    loadSermon(params.slug),
    auth(),
    getSiteSettings(),
  ])
  if (!sermon) notFound()

  // Drafts and archived sermons stay reachable for the people who manage them,
  // so a pastor can preview before publishing.
  const canManage = canManageContent(session?.user?.role)
  if (sermon.status !== SermonStatus.PUBLISHED && !canManage) notFound()

  const embed = toEmbed(sermon.videoUrl)
  const audio = isPlayableAudio(sermon.audioUrl) ? sermon.audioUrl : null
  const duration = formatDuration(sermon.duration)
  // Notes count alongside the transcript: both are on this public page, and a
  // sermon with good notes is worth asking even without a full transcript.
  const searchable = [sermon.transcript, sermon.notes].filter(Boolean).join('\n\n')

  const related = prisma
    ? await prisma.sermon
        .findMany({
          where: {
            status: SermonStatus.PUBLISHED,
            id: { not: sermon.id },
            // Same series if there is one, otherwise the same speaker.
            ...(sermon.seriesId ? { seriesId: sermon.seriesId } : { speaker: sermon.speaker }),
          },
          select: sermonCardSelect,
          orderBy: { preachedAt: 'desc' },
          take: 3,
        })
        .catch(() => [])
    : []

  return (
    <>
      {/*
        Only for sermons that are actually public. A draft rendered for the
        pastor previewing it must not carry markup announcing itself to search
        engines as published content.
      */}
      {sermon.status === SermonStatus.PUBLISHED && (
        <JsonLd
          data={[
            sermonSchema(sermon, settings),
            breadcrumbSchema(settings.url, [
              { name: 'Home', path: '/' },
              { name: 'Sermons', path: '/sermons' },
              ...(sermon.series
                ? [{ name: sermon.series.title, path: `/sermons?series=${sermon.series.slug}` }]
                : []),
              { name: sermon.title },
            ]),
          ]}
        />
      )}
      <PageHero
        eyebrow={sermon.series?.title ?? 'Sermon'}
        title={sermon.title}
        subtitle={sermon.description ?? undefined}
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/sermons', label: 'Sermons' },
        ]}
      />

      <div className="container pb-20 pt-4">
        {sermon.status !== SermonStatus.PUBLISHED && (
          <p className="mb-8 rounded-2xl border-2 border-primary/25 bg-primary-soft p-4 font-semibold text-primary">
            {sermon.status === SermonStatus.DRAFT
              ? 'This is a draft. Only pastors and administrators can see it.'
              : 'This sermon is archived and hidden from the public list.'}
          </p>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 2xl:gap-20">
          <div className="min-w-0">
            <SermonPlayer
              slug={sermon.slug}
              embed={embed ? { kind: embed.kind, src: embed.src } : null}
              audioUrl={audio}
              // Only offered when there was a link we could not embed —
              // otherwise there is nothing to send anyone to.
              fallbackUrl={!embed && !audio ? (sermon.videoUrl ?? sermon.audioUrl) : null}
            />

            {/* Both were provided: the video plays above, the audio sits here. */}
            {embed && audio && (
              <div className="mt-6 rounded-2xl border-2 border-border bg-card p-5">
                <p className="font-display font-bold text-foreground">Prefer to listen?</p>
                <audio controls preload="none" src={audio} className="mt-3 w-full">
                  Your browser cannot play audio.
                </audio>
              </div>
            )}

            {sermon.bibleText && (
              <section className="mt-10 rounded-3xl border-2 border-accent/25 bg-accent-soft/60 p-7 sm:p-9">
                <h2 className="text-xl text-accent-ink sm:text-2xl">
                  📖 {sermon.biblePassage ?? 'The passage'}
                </h2>
                <blockquote className="mt-4 text-pretty text-lg leading-relaxed text-foreground">
                  {sermon.bibleText}
                </blockquote>
              </section>
            )}

            {sermon.notes && (
              <section className="mt-12">
                <h2 className="flex items-center gap-2 text-2xl sm:text-3xl">
                  <FileText className="size-6 text-primary" aria-hidden />
                  Sermon notes
                </h2>
                <Markdown className="mt-5 max-w-3xl">{sermon.notes}</Markdown>
              </section>
            )}

            {sermon.studyQuestions.length > 0 && (
              <section className="mt-12 rounded-3xl border-2 border-border bg-secondary/40 p-7 sm:p-9">
                <h2 className="text-2xl sm:text-3xl">Questions to talk about</h2>
                <p className="mt-2 text-muted-foreground">
                  Good for a small group, a family meal, or on your own with a notebook.
                </p>
                <ol className="mt-6 space-y-4">
                  {sermon.studyQuestions.map((question, index) => (
                    <li key={question} className="flex gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-pretty text-foreground">{question}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/*
              Only offered when there is enough text to search. A question box
              over an empty transcript is a promise the page cannot keep.
            */}
            {searchable.length > 200 && (
              <AskSermon
                slug={sermon.slug}
                suggestions={sermon.studyQuestions.slice(0, 3)}
              />
            )}

            {sermon.transcript && (
              <section className="mt-12">
                <details className="rounded-3xl border-2 border-border bg-card p-7 sm:p-9">
                  <summary className="cursor-pointer font-display text-xl font-bold text-foreground">
                    Read the full transcript
                  </summary>
                  <div className="mt-6 max-w-3xl whitespace-pre-wrap text-pretty leading-relaxed text-muted-foreground">
                    {sermon.transcript}
                  </div>
                </details>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg">About this message</h2>

              <dl className="mt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-semibold text-muted-foreground">Preached by</dt>
                    <dd className="font-display font-bold text-foreground">{sermon.speaker}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <dt className="font-semibold text-muted-foreground">When</dt>
                    <dd className="font-display font-bold text-foreground">
                      <time dateTime={sermon.preachedAt.toISOString()}>
                        {formatSermonDate(sermon.preachedAt)}
                      </time>
                    </dd>
                  </div>
                </div>

                {duration && (
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <dt className="font-semibold text-muted-foreground">Length</dt>
                      <dd className="font-display font-bold text-foreground">{duration}</dd>
                    </div>
                  </div>
                )}

                {sermon.viewCount > 0 && (
                  <div className="flex items-start gap-3">
                    <Eye className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                    <div>
                      <dt className="font-semibold text-muted-foreground">Listened to by</dt>
                      <dd className="font-display font-bold text-foreground">
                        {sermon.viewCount} {sermon.viewCount === 1 ? 'person' : 'people'}
                      </dd>
                    </div>
                  </div>
                )}
              </dl>

              {sermon.series && (
                <Link
                  href={`/sermons?series=${sermon.series.slug}`}
                  className="mt-6 flex min-h-12 items-center justify-center rounded-xl border-2 border-primary/25 px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
                >
                  All of &ldquo;{sermon.series.title}&rdquo;
                </Link>
              )}

              {canManage && (
                <Link
                  href={`/admin/sermons/${sermon.slug}`}
                  className="mt-3 flex min-h-12 items-center justify-center rounded-xl bg-secondary px-4 font-semibold text-secondary-foreground transition-colors hover:brightness-95"
                >
                  Edit this sermon
                </Link>
              )}
            </div>

            {sermon.speakerBio && (
              <div className="rounded-3xl border-2 border-border bg-secondary/40 p-6">
                <h2 className="text-lg">About {sermon.speaker}</h2>
                <p className="mt-3 text-pretty text-muted-foreground">{sermon.speakerBio}</p>
              </div>
            )}

            {sermon.topics.length > 0 && (
              <div className="rounded-3xl border-2 border-border bg-card p-6">
                <h2 className="text-lg">Topics</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {sermon.topics.map((topic) => (
                    <li key={topic}>
                      <Link
                        href={`/sermons?topic=${encodeURIComponent(topic)}`}
                        className="flex min-h-10 items-center rounded-lg bg-accent-soft px-3 text-sm font-semibold text-accent-ink transition-colors hover:brightness-95"
                      >
                        {topic}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-3xl bg-royal-gradient p-6 text-white">
              <h2 className="text-lg text-white">Come and join us</h2>
              <ul className="mt-4 space-y-2 text-sm text-white/85">
                {settings.serviceTimes.map((service) => (
                  <li key={service.day}>
                    <span className="font-semibold text-white">{service.day}</span> · {service.time}
                  </li>
                ))}
              </ul>
              <Link
                href="/events"
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-accent-gradient px-4 font-display font-semibold text-accent-foreground transition-all hover:brightness-105"
              >
                See what is on
              </Link>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t-2 border-border pt-12">
            <h2 className="text-2xl sm:text-3xl">
              {sermon.series ? `More from ${sermon.series.title}` : `More from ${sermon.speaker}`}
            </h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {related.map((record) => (
                <li key={record.slug}>
                  <SermonCard sermon={toSermonCard(record)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}
