import {
  BookOpen,
  Cross,
  GraduationCap,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  UserCog,
  Users,
  Video,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { ProgressBar } from '@/components/discipleship/progress-bar'
import { MyEvents, type MyEvent } from '@/components/events/my-events'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { getCourses, getProgress } from '@/lib/discipleship'
import { formatEventDate } from '@/lib/events'
import { canAccessAdminArea, roleLabels } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { futureLinks } from '@/lib/site'
import { initials } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Your dashboard',
  robots: { index: false, follow: false },
}

const nextSteps = [
  {
    href: '/discipleship',
    label: 'Grow step by step',
    hint: 'Start the six-week course',
    Icon: GraduationCap,
  },
  { href: '/sermons', label: 'Catch up on sermons', hint: 'Watch or listen again', Icon: Video },
  {
    href: '/community/hub',
    label: 'Join the conversation',
    hint: 'Share, ask and encourage',
    Icon: MessageCircle,
  },
  {
    href: '/community/directory',
    label: 'Find your people',
    hint: 'Search the member directory',
    Icon: Users,
  },
  {
    href: '/community/help',
    label: 'Give or get a hand',
    hint: 'The help board',
    Icon: HeartHandshake,
  },
  {
    href: '/community/profile',
    label: 'Your profile',
    hint: 'Choose what people can see',
    Icon: UserCog,
  },
  { href: '/about', label: 'Read our story', hint: 'How this ministry began', Icon: Cross },
  { href: '/founder', label: 'Meet the founders', hint: 'The people who lead us', Icon: Users },
  { href: '/doctrine', label: 'What we believe', hint: 'Our faith, in plain words', Icon: BookOpen },
]

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { denied?: string }
}) {
  const user = await requireUser()
  const firstName = user.name?.split(' ')[0] ?? 'friend'

  // Bookings the member still has ahead of them, newest event first.
  const myEvents: MyEvent[] = prisma
    ? await prisma.eventRegistration
        .findMany({
          where: {
            userId: user.id,
            status: { not: 'CANCELLED' },
            event: { startsAt: { gte: new Date() }, status: { not: 'CANCELLED' } },
          },
          orderBy: { event: { startsAt: 'asc' } },
          take: 8,
          select: {
            token: true,
            code: true,
            status: true,
            waitlistPosition: true,
            guests: true,
            event: { select: { slug: true, title: true, startsAt: true, endsAt: true } },
          },
        })
        .then((rows) =>
          rows.map((row) => ({
            token: row.token,
            eventSlug: row.event.slug,
            title: row.event.title,
            when: formatEventDate(row.event.startsAt, row.event.endsAt),
            code: row.code,
            status: row.status,
            waitlistPosition: row.waitlistPosition,
            guests: row.guests,
          })),
        )
        .catch(() => [])
    : []

  // Only the course they have actually started is worth surfacing here.
  const courses = await getCourses()
  const started = (
    await Promise.all(
      courses.map(async (course) => ({ course, progress: await getProgress(user.id, course) })),
    )
  ).find((entry) => entry.progress.completedCount > 0)

  // Only nudge staff who have not already done it.
  const twoFactorOn = prisma
    ? await prisma.user
        .findUnique({ where: { id: user.id }, select: { twoFactorEnabledAt: true } })
        .then((row) => Boolean(row?.twoFactorEnabledAt))
        .catch(() => true)
    : true

  const deniedMessages: Record<string, string> = {
    admin: 'That area is for ministry leaders only. If you think you should have access, please speak to the church office.',
    content: 'Only pastors and administrators can edit the curriculum.',
    'follow-up': 'That area is for the follow-up team.',
  }
  const deniedMessage = searchParams.denied ? deniedMessages[searchParams.denied] : undefined

  return (
    <div className="container py-14 sm:py-20">
      {deniedMessage && (
        <Alert variant="error" className="mb-8">
          {deniedMessage}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-5">
        <span
          aria-hidden
          className="grid size-20 shrink-0 place-items-center rounded-3xl bg-royal-gradient font-display text-2xl font-extrabold text-primary-foreground shadow-lifted"
        >
          {initials(user.name ?? 'Friend')}
        </span>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            {roleLabels[user.role]}
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Welcome, {firstName}!</h1>
          <p className="mt-2 text-pretty text-muted-foreground">
            We are so glad you are here. Your account is ready.
          </p>
        </div>
      </div>

      {started && (
        <Card className="mt-10 border-primary/25">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 font-semibold">
              <GraduationCap className="size-5 text-primary" aria-hidden />
              You are part way through
            </CardDescription>
            <CardTitle className="text-2xl">{started.course.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <ProgressBar
                percent={started.progress.percent}
                label={`${started.course.title} progress: ${started.progress.percent}% complete`}
              />
              <p className="shrink-0 font-display font-bold text-primary">
                {started.progress.completedCount} / {started.course.lessonCount}
              </p>
            </div>

            {started.progress.nextLesson ? (
              <Button asChild>
                <Link
                  href={`/discipleship/${started.course.slug}/lesson/${started.progress.nextLesson.slug}`}
                >
                  Continue: {started.progress.nextLesson.title}
                </Link>
              </Button>
            ) : (
              <p className="font-semibold text-success">
                🎉 You have finished every lesson. Well done!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {canAccessAdminArea(user.role) && !twoFactorOn && (
        <Card className="mt-10 border-accent/40 bg-accent-soft/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="size-7 text-accent-ink" aria-hidden />
              Protect this account
            </CardTitle>
            <CardDescription>
              You can reach private prayer requests and members&apos; contact details. Two-factor
              authentication takes about a minute to switch on.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/account/security">Set it up</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {canAccessAdminArea(user.role) && (
        <Card className="mt-10 border-primary/25 bg-primary-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <ShieldCheck className="size-7 text-primary" aria-hidden />
              Ministry tools
            </CardTitle>
            <CardDescription>
              Follow up on decisions and keep the ministry&apos;s content up to date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/admin">Open admin</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <MyEvents events={myEvents} />

      <section aria-labelledby="next-steps" className="mt-14">
        <h2 id="next-steps" className="text-2xl sm:text-3xl">
          Good places to start
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {nextSteps.map(({ href, label, hint, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-7" aria-hidden />
                </span>
                <span>
                  <span className="block font-display text-lg font-bold text-foreground">
                    {label}
                  </span>
                  <span className="mt-1 block text-muted-foreground">{hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {futureLinks.length > 0 && (
        <section aria-labelledby="coming-soon" className="mt-14">
          <h2 id="coming-soon" className="text-2xl sm:text-3xl">
            Unlocking soon for members
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
            Your account already covers everything below. As each one opens up, it will simply
            appear here — nothing else for you to do.
          </p>
          <ul className="mt-6 flex flex-wrap gap-3">
            {futureLinks.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2 rounded-full border-2 border-dashed border-border bg-secondary/40 px-4 py-2.5 font-semibold text-muted-foreground"
              >
                <span aria-hidden>{item.emoji}</span>
                {item.label}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
