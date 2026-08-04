import { Briefcase, Cake, Handshake, Home, Mail, MapPin, Phone, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PageHero } from '@/components/page-hero'
import { requireUser } from '@/lib/auth'
import { loadBadges } from '@/lib/badges'
import { prisma } from '@/lib/prisma'
import { directorySelect, redactProfile } from '@/lib/profiles'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Member',
  robots: { index: false, follow: false },
}

export default async function MemberPage({ params }: { params: { id: string } }) {
  const viewer = await requireUser(`/community/members/${params.id}`)
  if (!prisma) notFound()

  const record = await prisma.user
    .findFirst({
      where: {
        id: params.id,
        bannedAt: null,
        // Somebody who left the directory is not findable by URL either — the
        // switch would be worth very little if the page still answered.
        OR: [{ profile: { is: { listed: true } } }, { id: viewer.id }],
      },
      select: directorySelect,
    })
    .catch(() => null)

  if (!record) notFound()

  const person = redactProfile(record, viewer.id)
  const badges = await loadBadges(person.id)
  const earned = badges.filter((badge) => badge.earned)

  return (
    <>
      <PageHero
        eyebrow={person.isMe ? 'Your profile' : 'Church family'}
        title={person.name}
        subtitle={person.headline ?? undefined}
        crumbs={[
          { href: '/community', label: 'Community' },
          { href: '/community/directory', label: 'Directory' },
        ]}
      />

      <div className="container pb-20 pt-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14">
          <div className="min-w-0">
            {person.isMe && (
              <Link
                href="/community/profile"
                className="mb-8 inline-flex min-h-12 items-center gap-2 rounded-xl border-2 border-primary/25 px-5 font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                <Settings className="size-5" aria-hidden />
                Edit your profile and privacy
              </Link>
            )}

            {person.bio ? (
              <section>
                <h2 className="text-2xl">About</h2>
                <p className="mt-4 whitespace-pre-wrap text-pretty leading-relaxed text-foreground">
                  {person.bio}
                </p>
              </section>
            ) : (
              <p className="text-muted-foreground">
                {person.isMe
                  ? 'You have not written anything about yourself yet.'
                  : `${person.name} has not written a bio yet.`}
              </p>
            )}

            {person.spiritualGifts.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl">Spiritual gifts</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {person.spiritualGifts.map((gift) => (
                    <li key={gift}>
                      <Link
                        href={`/community/directory?gift=${encodeURIComponent(gift)}`}
                        className="flex min-h-10 items-center rounded-lg bg-accent-soft px-3 text-sm font-semibold text-accent-ink hover:brightness-95"
                      >
                        {gift}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {person.skills.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl">Happy to help with</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {person.skills.map((skill) => (
                    <li key={skill}>
                      <Link
                        href={`/community/directory?skill=${encodeURIComponent(skill)}`}
                        className="flex min-h-10 items-center rounded-lg bg-secondary px-3 text-sm font-semibold text-secondary-foreground hover:brightness-95"
                      >
                        {skill}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {person.interests.length > 0 && (
              <section className="mt-8">
                <h2 className="text-xl">Interests</h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {person.interests.map((tag) => (
                    <li key={tag}>
                      <Link
                        href={`/community/directory?interest=${encodeURIComponent(tag)}`}
                        className="flex min-h-10 items-center rounded-lg border-2 border-border px-3 text-sm font-semibold text-muted-foreground hover:border-primary/25 hover:text-foreground"
                      >
                        {tag}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {earned.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl">Thank you for</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Not a score, and not a league table. Just the church noticing.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {earned.map((badge) => (
                    <li
                      key={badge.id}
                      className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-4"
                    >
                      <span aria-hidden className="text-2xl">
                        {badge.emoji}
                      </span>
                      <span>
                        <span className="block font-display font-bold text-foreground">
                          {badge.label}
                        </span>
                        <span className="block text-sm text-muted-foreground">{badge.hint}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
              <div className="flex items-center gap-4">
                {person.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary provider
                  <img
                    src={person.avatar}
                    alt=""
                    className="size-16 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-16 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-2xl font-bold text-primary"
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <p className="font-display text-lg font-bold text-foreground">{person.name}</p>
              </div>

              <dl className="mt-6 space-y-4 text-sm">
                {person.neighbourhood && (
                  <Row icon={MapPin} label="Area" value={person.neighbourhood} />
                )}
                {person.profession && (
                  <Row icon={Briefcase} label="Does" value={person.profession} />
                )}
                {person.address && (
                  <Row icon={Home} label="Address" value={person.address} />
                )}
                {person.email && (
                  <Row icon={Mail} label="Email" value={person.email} href={`mailto:${person.email}`} />
                )}
                {person.phone && (
                  <Row icon={Phone} label="Phone" value={person.phone} href={`tel:${person.phone}`} />
                )}
                {person.birthday && <Row icon={Cake} label="Birthday" value={person.birthday} />}
                {person.mentorAvailable && (
                  <Row icon={Handshake} label="Mentoring" value="Happy to mentor" />
                )}
              </dl>

              {/* Says nothing about *why* something is missing — "hidden" would
                  itself be information about the person. */}
              {!person.email && !person.phone && !person.isMe && (
                <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
                  Message {person.name.split(' ')[0]} through{' '}
                  <Link href="/chat" className="font-semibold text-primary hover:underline">
                    chat
                  </Link>
                  .
                </p>
              )}
            </div>

            {person.ministries.length > 0 && (
              <div className="rounded-3xl border-2 border-border bg-secondary/40 p-6">
                <h2 className="text-lg">Serves in</h2>
                <ul className="mt-3 space-y-1.5 text-muted-foreground">
                  {person.ministries.map((ministry) => (
                    <li key={ministry.slug}>{ministry.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {person.groups.length > 0 && (
              <div className="rounded-3xl border-2 border-border bg-secondary/40 p-6">
                <h2 className="text-lg">Meets with</h2>
                <ul className="mt-3 space-y-1.5 text-muted-foreground">
                  {person.groups.map((group) => (
                    <li key={group.slug}>{group.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof MapPin
  label: string
  value: string
  href?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="font-semibold text-muted-foreground">{label}</dt>
        <dd className={cn('font-display font-bold text-foreground', href && 'break-words')}>
          {href ? (
            <a href={href} className="hover:text-primary hover:underline">
              {value}
            </a>
          ) : (
            value
          )}
        </dd>
      </div>
    </div>
  )
}
