import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InitiativeTracker } from '@/components/community/initiative-tracker'
import { Markdown } from '@/components/markdown'
import { PageHero } from '@/components/page-hero'
import { auth, requireUser } from '@/lib/auth'
import {
  currentDayNumber,
  formatRange,
  initiativeEmoji,
  initiativeLabels,
  initiativeStatus,
  initiativeVerbs,
  progressFor,
  totalDays,
} from '@/lib/initiatives'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function load(slug: string) {
  if (!prisma) return null
  try {
    return await prisma.initiative.findUnique({
      where: { slug },
      include: {
        days: { orderBy: { dayNumber: 'asc' } },
        members: {
          where: { visible: true },
          take: 24,
          orderBy: { joinedAt: 'asc' },
          select: {
            intent: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        _count: { select: { members: true } },
      },
    })
  } catch (error) {
    console.error('[initiative]', error)
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const initiative = await load(params.slug)
  if (!initiative) return { title: 'Growing together' }

  return {
    title: initiative.title,
    description: initiative.description ?? undefined,
    alternates: { canonical: `/community/growing/${initiative.slug}` },
  }
}

export default async function InitiativePage({ params }: { params: { slug: string } }) {
  // Members only — see the note in app/(public)/community/page.tsx.
  await requireUser('/community/growing')

  const [initiative, session] = await Promise.all([load(params.slug), auth()])
  if (!initiative) notFound()

  const progress = session?.user
    ? await progressFor(initiative.id, session.user.id)
    : { joined: false, logged: 0, loggedDays: new Set<number>() }

  const status = initiativeStatus(initiative)
  const total = totalDays(initiative)

  return (
    <>
      <PageHero
        eyebrow={`${initiativeEmoji[initiative.kind]} ${initiativeLabels[initiative.kind]}`}
        title={initiative.title}
        subtitle={initiative.description ?? undefined}
        photo="learning"
        crumbs={[
          { href: '/community', label: 'Community' },
          { href: '/community/growing', label: 'Growing together' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <div className="min-w-0">
            <p className="font-display font-bold text-muted-foreground">
              {formatRange(initiative.startsOn, initiative.endsOn)} · {total}{' '}
              {total === 1 ? 'day' : 'days'} ·{' '}
              {status === 'running'
                ? 'running now'
                : status === 'upcoming'
                  ? 'starting soon'
                  : 'finished'}
            </p>

            {initiative.details && (
              <Markdown className="mt-8 max-w-3xl">{initiative.details}</Markdown>
            )}

            <div className="mt-10">
              <InitiativeTracker
                slug={initiative.slug}
                kind={initiative.kind}
                verbs={initiativeVerbs[initiative.kind]}
                days={initiative.days.map((day) => ({
                  dayNumber: day.dayNumber,
                  reference: day.reference,
                  title: day.title,
                }))}
                totalDays={total}
                today={currentDayNumber(initiative)}
                joined={progress.joined}
                loggedDays={[...progress.loggedDays]}
                status={status}
                signedIn={Boolean(session?.user)}
              />
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
              <h2 className="text-lg">
                {initiative._count.members}{' '}
                {initiative._count.members === 1 ? 'person' : 'people'} taking part
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You are not doing this on your own.
              </p>

              {initiative.members.length > 0 && (
                <ul className="mt-5 flex flex-wrap gap-2">
                  {initiative.members.map((member) => (
                    <li key={member.user.id} title={member.user.name}>
                      {member.user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- arbitrary provider
                        <img
                          src={member.user.image}
                          alt={member.user.name}
                          className="size-10 rounded-full object-cover"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="grid size-10 place-items-center rounded-full bg-primary-soft font-display font-bold text-primary"
                        >
                          {member.user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="sr-only">{member.user.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-3xl bg-royal-gradient p-6 text-white">
              <h2 className="text-lg text-white">Share how it is going</h2>
              <p className="mt-3 text-pretty text-white/85">
                Encourage somebody who is finding this week hard.
              </p>
              <a
                href={initiative.kind === 'CHALLENGE' ? '/community/challenge' : '/community'}
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-accent-gradient px-4 font-display font-semibold text-accent-foreground transition-all hover:brightness-105"
              >
                Post to the family
              </a>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}
