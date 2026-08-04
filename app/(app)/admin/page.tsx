import {
  Activity,
  ArrowRight,
  CalendarDays,
  Database,
  FileText,
  GraduationCap,
  HandHeart,
  Heart,
  HeartHandshake,
  Lock,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  PencilLine,
  Quote,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireAdminArea } from '@/lib/auth'
import { getPageContent, type PageSlug } from '@/lib/page-content'
import { canModerateChat } from '@/lib/chat'
import { canModerateCommunity } from '@/lib/community'
import { canReadCare } from '@/lib/initiatives'
import {
  canApproveTestimony,
  canManageContent,
  canManageEvents,
  canManageFollowUp,
  canModeratePrayer,
} from '@/lib/permissions'
import { isDatabaseConfigured, prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
}

const managedPages: { slug: PageSlug; href: string }[] = [
  { slug: 'about', href: '/about' },
  { slug: 'founder', href: '/founder' },
  { slug: 'doctrine', href: '/doctrine' },
]

async function countMembers() {
  if (!prisma) return null
  try {
    return await prisma.user.count()
  } catch {
    return null
  }
}

async function countPendingFollowUps() {
  if (!prisma) return null
  try {
    return await prisma.salvationDecision.count({
      where: { stepContact: true, followUpStatus: 'PENDING' },
    })
  } catch {
    return null
  }
}

async function countUrgentPrayers() {
  if (!prisma) return null
  try {
    return await prisma.prayerRequest.count({
      where: { status: 'ACTIVE', urgency: { in: ['HIGH', 'URGENT'] } },
    })
  } catch {
    return null
  }
}

async function countPendingTestimonies() {
  if (!prisma) return null
  try {
    return await prisma.testimony.count({ where: { status: 'PENDING' } })
  } catch {
    return null
  }
}

async function countChatReports() {
  if (!prisma) return null
  try {
    return await prisma.messageReport.count({ where: { status: 'PENDING' } })
  } catch {
    return null
  }
}

async function countUpcomingEvents() {
  if (!prisma) return null
  try {
    return await prisma.event.count({
      where: { status: 'PUBLISHED', startsAt: { gte: new Date() } },
    })
  } catch {
    return null
  }
}

async function countDraftSermons() {
  if (!prisma) return null
  try {
    return await prisma.sermon.count({ where: { status: 'DRAFT' } })
  } catch {
    return null
  }
}

async function countCommunityReports() {
  if (!prisma) return null
  try {
    return await prisma.postReport.count({ where: { status: 'PENDING' } })
  } catch {
    return null
  }
}

async function countOpenCare() {
  if (!prisma) return null
  try {
    return await prisma.careRequest.count({ where: { status: 'OPEN' } })
  } catch {
    return null
  }
}

export default async function AdminPage() {
  const user = await requireAdminArea()

  const [
    pages,
    memberCount,
    pendingFollowUps,
    urgentPrayers,
    pendingTestimonies,
    upcomingEvents,
    chatReports,
    draftSermons,
    communityReports,
    openCare,
  ] = await Promise.all([
    Promise.all(managedPages.map(async (entry) => ({ ...entry, page: await getPageContent(entry.slug) }))),
    countMembers(),
    countPendingFollowUps(),
    countUrgentPrayers(),
    countPendingTestimonies(),
    countUpcomingEvents(),
    countChatReports(),
    countDraftSermons(),
    countCommunityReports(),
    countOpenCare(),
  ])

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <ShieldCheck className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Administrator
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Ministry admin</h1>
        </div>
      </div>

      {!isDatabaseConfigured && (
        <Alert variant="info" className="mt-8">
          No database is connected yet, so the site is serving the bundled copy of every page. Add a{' '}
          <code>DATABASE_URL</code> and run <code>npm run db:migrate</code> then{' '}
          <code>npm run db:seed</code> to switch on editing.
        </Alert>
      )}

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 font-semibold">
              <Users className="size-5 text-primary" aria-hidden />
              Members
            </CardDescription>
            <CardTitle className="text-4xl">{memberCount ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 font-semibold">
              <FileText className="size-5 text-primary" aria-hidden />
              Editable pages
            </CardDescription>
            <CardTitle className="text-4xl">{managedPages.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2 font-semibold">
              <Database className="size-5 text-primary" aria-hidden />
              Database
            </CardDescription>
            <CardTitle className="text-2xl">
              {isDatabaseConfigured ? 'Connected' : 'Not connected'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <section aria-labelledby="ministry-areas" className="mt-14">
        <h2 id="ministry-areas" className="text-2xl sm:text-3xl">
          Ministry areas
        </h2>

        <ul className="mt-6 grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {canManageContent(user.role) && (
            <li>
              <Link
                href="/admin/sermons"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Video className="size-7" aria-hidden />
                  </span>
                  {draftSermons !== null && draftSermons > 0 && (
                    <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                      {draftSermons} draft{draftSermons === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Sermons
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Upload messages, group them into series, and add notes and study questions.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canModerateCommunity(user.role) && (
            <li>
              <Link
                href="/admin/community"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <MessagesSquare className="size-7" aria-hidden />
                  </span>
                  {communityReports !== null && communityReports > 0 && (
                    <span className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                      {communityReports} reported
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Community feed
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Read what members reported, remove or restore posts, and pin announcements.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canManageEvents(user.role) && (
            <li>
              <Link
                href="/admin/announcements"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Megaphone className="size-7" aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Announcements
                    <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    General and departmental notices, with a design attached if you have one.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canManageContent(user.role) && (
            <li>
              <Link
                href="/admin/pastors-word"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Quote className="size-7" aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    The Pastor&rsquo;s Word
                    <ArrowRight className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Fills itself in daily. Write your own for any day, or let the rotation run.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canManageContent(user.role) && (
            <li>
              <Link
                href="/admin/calendar"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <CalendarDays className="size-7" aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Christian calendar
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Easter and everything that moves with it, worked out for you. Change the
                    wording and the artwork.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canReadCare(user.role) && (
            <li>
              <Link
                href="/admin/care"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Lock className="size-7" aria-hidden />
                  </span>
                  {openCare !== null && openCare > 0 && (
                    <span className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                      {openCare} waiting
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Pastoral care
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Questions for an elder and quiet requests for practical help. Pastors only.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canModerateCommunity(user.role) && (
            <li>
              <Link
                href="/admin/community-health"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Activity className="size-7" aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Community health
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    When people are online, who has gone quiet, and what actually landed.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canManageFollowUp(user.role) && (
            <li>
              <Link
                href="/admin/salvation"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <HeartHandshake className="size-7" aria-hidden />
                  </span>
                  {pendingFollowUps !== null && pendingFollowUps > 0 && (
                    <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                      {pendingFollowUps} waiting
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Salvation decisions
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    See who has responded, assign follow-up, and record how it went.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canManageEvents(user.role) && (
            <li>
              <Link
                href="/admin/events"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <CalendarDays className="size-7" aria-hidden />
                  </span>
                  {upcomingEvents !== null && upcomingEvents > 0 && (
                    <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                      {upcomingEvents} coming up
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Events
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Create events, see who is coming, and check people in with a QR scan.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canModerateChat(user.role) && (
            <li>
              <Link
                href="/admin/chat"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <MessageCircle className="size-7" aria-hidden />
                  </span>
                  {chatReports !== null && chatReports > 0 && (
                    <span className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                      {chatReports} reported
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Chat moderation
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Review reports, set the word filter and retention, and ban from chat.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canModeratePrayer(user.role) && (
            <li>
              <Link
                href="/admin/prayer"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <HandHeart className="size-7" aria-hidden />
                  </span>
                  {urgentPrayers !== null && urgentPrayers > 0 && (
                    <span className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
                      {urgentPrayers} urgent
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Prayer team
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Read requests, log prayers, mark answers and flag anything needing a pastor.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canApproveTestimony(user.role) && (
            <li>
              <Link
                href="/admin/testimonies"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Sparkles className="size-7" aria-hidden />
                  </span>
                  {pendingTestimonies !== null && pendingTestimonies > 0 && (
                    <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
                      {pendingTestimonies} waiting
                    </span>
                  )}
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Testimonies
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Approve God stories before they are published, and feature the best.
                  </span>
                </span>
              </Link>
            </li>
          )}

          {canManageContent(user.role) && (
            <li>
              <Link
                href="/admin/discipleship"
                className="group flex h-full flex-col gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0 sm:p-8"
              >
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <GraduationCap className="size-7" aria-hidden />
                </span>
                <span>
                  <span className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
                    Discipleship curriculum
                    <ArrowRight
                      className="size-5 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                      aria-hidden
                    />
                  </span>
                  <span className="mt-1 block text-pretty text-muted-foreground">
                    Create and edit courses, weeks and lessons.
                  </span>
                </span>
              </Link>
            </li>
          )}
        </ul>
      </section>

      {canManageContent(user.role) && (
      <section aria-labelledby="manage-pages" className="mt-14">
        <h2 id="manage-pages" className="text-2xl sm:text-3xl">
          Page content
        </h2>
        <p className="mt-3 max-w-2xl text-pretty text-muted-foreground">
          Every word on this site can be changed from here, at any time, without a developer.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          <li>
            <Link
              href="/admin/settings"
              className="group flex h-full items-start gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Settings className="size-6" aria-hidden />
              </span>
              <span>
                <span className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  Ministry details
                  <ArrowRight
                    className="size-4 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-pretty text-sm text-muted-foreground">
                  Name, tagline, contact details, service times and social links.
                </span>
              </span>
            </Link>
          </li>

          <li>
            <Link
              href="/admin/gospel"
              className="group flex h-full items-start gap-4 rounded-3xl border-2 border-border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-primary/35 hover:shadow-lifted motion-reduce:hover:translate-y-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Heart className="size-6" aria-hidden />
              </span>
              <span>
                <span className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
                  Salvation journey
                  <ArrowRight
                    className="size-4 text-primary transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-pretty text-sm text-muted-foreground">
                  The gospel steps, the prayer, and what happens next.
                </span>
              </span>
            </Link>
          </li>
        </ul>

        <ul className="mt-6 space-y-4">
          {pages.map(({ slug, href, page }) => (
            <li key={slug}>
              <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="text-xl">{page.title}</CardTitle>
                    <CardDescription className="mt-1">
                      <code>/{slug}</code> ·{' '}
                      {page.source === 'database' ? (
                        <>
                          from database
                          {page.updatedAt ? ` · updated ${formatDate(page.updatedAt)}` : ''}
                        </>
                      ) : (
                        'from bundled content file'
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={href}>View page</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/admin/pages?page=${slug}`}>
                        <PencilLine aria-hidden className="size-4" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            </li>
          ))}
        </ul>
      </section>
      )}
    </div>
  )
}
