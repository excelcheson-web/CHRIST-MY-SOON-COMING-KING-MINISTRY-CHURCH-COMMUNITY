import type { Metadata } from 'next'

import { ChannelBoard } from '@/components/community/channel-board'
import { PageHero } from '@/components/page-hero'
import { auth } from '@/lib/auth'
import { loadChannel } from '@/lib/channels'
import { canModerateCommunity } from '@/lib/community'
import { startOfDay } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Verse of the day',
  description: 'A verse each day, and what it said to the church family.',
  alternates: { canonical: '/community/verse' },
}

export default async function VersePage() {
  const session = await auth()
  const today = startOfDay()

  const [{ viewer, posts, nextCursor }, verse] = await Promise.all([
    loadChannel('VERSE', session?.user),
    prisma
      ? prisma.dailyVerse
          .findFirst({ where: { showOn: { lte: today } }, orderBy: { showOn: 'desc' } })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  return (
    <>
      <PageHero
        eyebrow="Every day"
        title="Verse of the day"
        subtitle="One verse, every morning. Read it, sit with it, and tell us what it said to you."
        photo="scripture"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        {verse ? (
          <div className="mx-auto mb-10 max-w-3xl rounded-3xl border-2 border-accent/25 bg-accent-soft/60 p-7 sm:p-10">
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-accent-ink">
              {verse.showOn.getTime() === today.getTime()
                ? 'Today'
                : new Intl.DateTimeFormat('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  }).format(verse.showOn)}
            </p>

            <blockquote className="mt-4">
              <p className="text-pretty font-display text-2xl font-bold leading-snug text-foreground sm:text-3xl">
                “{verse.text}”
              </p>
              <footer className="mt-4 font-display font-bold text-accent-ink">
                {verse.reference}
              </footer>
            </blockquote>

            {verse.reflection && (
              <p className="mt-6 text-pretty leading-relaxed text-foreground/80">
                {verse.reflection}
              </p>
            )}
          </div>
        ) : (
          <p className="mx-auto mb-10 max-w-3xl rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center text-pretty text-muted-foreground">
            No verse scheduled yet. A pastor can add one from the admin area.
          </p>
        )}

        <ChannelBoard
          channel="VERSE"
          initial={{ posts, nextCursor }}
          signedIn={Boolean(viewer.id)}
          canModerate={canModerateCommunity(viewer.role)}
          placeholder="What did this say to you today?"
          emptyLine="Nobody has shared a reflection yet. There is no wrong answer here — say what you noticed."
        />
      </div>
    </>
  )
}
