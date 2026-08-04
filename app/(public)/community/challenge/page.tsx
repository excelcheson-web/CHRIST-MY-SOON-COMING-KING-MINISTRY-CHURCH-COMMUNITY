import { InitiativeKind } from '@prisma/client'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ChannelBoard } from '@/components/community/channel-board'
import { PageHero } from '@/components/page-hero'
import { auth, requireUser } from '@/lib/auth'
import { loadChannel } from '@/lib/channels'
import { canModerateCommunity } from '@/lib/community'
import { formatRange } from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'This week’s challenge',
  description: 'A small, doable challenge each week — and how the church family got on.',
  alternates: { canonical: '/community/challenge' },
}

export default async function ChallengePage() {
  // Members only. The whole community section is behind the door: the
  // church asked for it, and a directory or a prayer thread that a stranger
  // can read is not a church family talking to one another.
  await requireUser('/community/challenge')
  const session = await auth()
  const now = new Date()

  const [{ viewer, posts, nextCursor }, challenge] = await Promise.all([
    loadChannel('CHALLENGE', session?.user),
    // The one that is running right now; failing that, the most recent.
    prisma
      ? prisma.initiative
          .findFirst({
            where: { kind: InitiativeKind.CHALLENGE, isActive: true },
            orderBy: [{ startsOn: 'desc' }],
            select: {
              slug: true,
              title: true,
              description: true,
              details: true,
              startsOn: true,
              endsOn: true,
              _count: { select: { members: true } },
            },
          })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  const running = challenge && challenge.startsOn <= now && challenge.endsOn >= now

  return (
    <>
      <PageHero
        eyebrow="Every week"
        title="This week’s challenge"
        subtitle="One small thing, done on purpose. Nothing heroic — just a nudge out of the ordinary."
        photo="learning"
        crumbs={[
          { href: '/', label: 'Home' },
          { href: '/community', label: 'Community' },
        ]}
      />

      <div className="container pb-20 pt-4">
        {challenge ? (
          <div className="mx-auto mb-10 max-w-3xl rounded-3xl bg-royal-gradient p-7 text-white sm:p-10">
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-accent">
              {running ? 'Running now' : 'Most recent'} · {formatRange(challenge.startsOn, challenge.endsOn)}
            </p>
            <h2 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">
              {challenge.title}
            </h2>
            {challenge.description && (
              <p className="mt-4 text-pretty leading-relaxed text-white/85">
                {challenge.description}
              </p>
            )}
            <p className="mt-6 text-sm text-white/70">
              {challenge._count.members}{' '}
              {challenge._count.members === 1 ? 'person is' : 'people are'} taking part
            </p>
            <Link
              href={`/community/growing/${challenge.slug}`}
              className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-accent-gradient px-6 font-display font-semibold text-accent-foreground transition-all hover:brightness-105"
            >
              Take the challenge
            </Link>
          </div>
        ) : (
          <p className="mx-auto mb-10 max-w-3xl rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center text-pretty text-muted-foreground">
            No challenge running at the moment. A pastor can start one from the admin area.
          </p>
        )}

        <ChannelBoard
          channel="CHALLENGE"
          initial={{ posts, nextCursor }}
          signedIn={Boolean(viewer.id)}
          canModerate={canModerateCommunity(viewer.role)}
          placeholder="How did you get on? What happened?"
          emptyLine="Nobody has shared yet. Tell us how it went — including if it went badly."
        />
      </div>
    </>
  )
}
