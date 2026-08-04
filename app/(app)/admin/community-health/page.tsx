import { Activity, PhoneCall } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Alert } from '@/components/ui/alert'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { canModerateCommunity } from '@/lib/community'
import { communityTotals, engagementHeatmap, popularContent } from '@/lib/metrics'
import { isDatabaseConfigured } from '@/lib/prisma'
import { quietMembers } from '@/lib/profiles'
import { channelLabels } from '@/lib/reactions'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Community health',
  robots: { index: false, follow: false },
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function CommunityHealthPage() {
  const user = await requireUser('/admin/community-health')
  if (!canModerateCommunity(user.role)) redirect('/dashboard?denied=community')

  if (!isDatabaseConfigured) {
    return (
      <div className="container py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl">Community health</h1>
        <Alert variant="info" className="mt-8">
          No database is connected yet.
        </Alert>
      </div>
    )
  }

  const [totals, heat, popular, quiet] = await Promise.all([
    communityTotals(),
    engagementHeatmap(),
    popularContent(),
    quietMembers(30, 40),
  ])

  const busiest = Math.max(1, ...heat.map((cell) => cell.count))

  return (
    <div className="container py-14 sm:py-20">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
          <Activity className="size-8" aria-hidden />
        </span>
        <div>
          <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
            Last 30 days
          </p>
          <h1 className="mt-1 text-3xl sm:text-4xl">Community health</h1>
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Members" value={totals.members} />
        <Stat label="Active this month" value={totals.active} />
        <Stat label="Posts" value={totals.posts} />
        <Stat label="Reactions" value={totals.reactions} />
        <Stat label="Help requests open" value={totals.helpOpen} />
        <Stat label="Plans & fasts running" value={totals.initiatives} />
      </div>

      <section aria-labelledby="heatmap" className="mt-14">
        <h2 id="heatmap" className="text-2xl sm:text-3xl">
          When people are here
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
          Posts and replies over the last two months, by day and hour. Use it to pick the time for
          a live prayer meeting or an announcement — not to judge anybody.
        </p>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[42rem] border-separate border-spacing-1">
            <caption className="sr-only">Activity by day of the week and hour of the day</caption>
            <thead>
              <tr>
                <th scope="col" className="w-12" />
                {Array.from({ length: 24 }, (_, hour) => (
                  <th
                    key={hour}
                    scope="col"
                    className="text-[0.6rem] font-semibold text-muted-foreground"
                  >
                    {hour % 3 === 0 ? hour : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dayNames.map((name, day) => (
                <tr key={name}>
                  <th
                    scope="row"
                    className="pr-2 text-right text-xs font-semibold text-muted-foreground"
                  >
                    {name}
                  </th>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const cell = heat.find((row) => row.day === day && row.hour === hour)
                    const count = cell?.count ?? 0
                    // Five steps rather than a continuous scale: at a glance
                    // "busy or not" is the only question being asked.
                    const level = count === 0 ? 0 : Math.ceil((count / busiest) * 4)

                    return (
                      <td
                        key={hour}
                        title={`${name} ${hour}:00 — ${count} ${count === 1 ? 'post' : 'posts'}`}
                        className={cn(
                          'h-6 rounded',
                          level === 0 && 'bg-secondary',
                          level === 1 && 'bg-primary/20',
                          level === 2 && 'bg-primary/40',
                          level === 3 && 'bg-primary/65',
                          level >= 4 && 'bg-primary',
                        )}
                      >
                        <span className="sr-only">
                          {name} {hour}:00, {count} posts
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="quiet" className="mt-14">
        <h2 id="quiet" className="flex items-center gap-2 text-2xl sm:text-3xl">
          <PhoneCall className="size-6 text-primary" aria-hidden />
          Quiet for a month
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
          Nobody here has done anything wrong. Life gets heavy and people go quiet — this is a list
          of phone calls worth making, not a performance report.
        </p>

        {quiet.length === 0 ? (
          <p className="mt-6 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center text-muted-foreground">
            Everybody has been active this month.
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {quiet.map((member) => (
              <li
                key={member.id}
                className="rounded-2xl border-2 border-border bg-card p-4"
              >
                <p className="font-display font-bold text-foreground">{member.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {member.profile?.lastActiveAt
                    ? `Last seen ${new Intl.DateTimeFormat('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      }).format(member.profile.lastActiveAt)}`
                    : 'Never active'}
                </p>
                {member.smallGroups[0] && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    In {member.smallGroups[0].group.name}
                  </p>
                )}
                <a
                  href={`mailto:${member.email}`}
                  className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
                >
                  Send a note
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="popular" className="mt-14">
        <h2 id="popular" className="text-2xl sm:text-3xl">
          What landed
        </h2>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h3 className="text-lg">Posts</h3>
            <ul className="mt-4 space-y-3">
              {popular.posts.map((post) => (
                <li key={post.id} className="text-sm">
                  <p className="line-clamp-2 text-foreground">{post.body}</p>
                  <p className="mt-1 text-muted-foreground">
                    {post.author.name} · {channelLabels[post.channel]} · {post.commentCount} replies
                    · {post._count.reactions} reactions
                  </p>
                </li>
              ))}
              {popular.posts.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h3 className="text-lg">Sermons</h3>
            <ul className="mt-4 space-y-3">
              {popular.sermons.map((sermon) => (
                <li key={sermon.slug} className="text-sm">
                  <Link
                    href={`/sermons/${sermon.slug}`}
                    className="font-semibold text-foreground hover:text-primary"
                  >
                    {sermon.title}
                  </Link>
                  <p className="mt-0.5 text-muted-foreground">
                    {sermon.speaker} · {sermon.viewCount} listens
                  </p>
                </li>
              ))}
              {popular.sermons.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing yet.</li>
              )}
            </ul>
          </div>

          <div className="rounded-3xl border-2 border-border bg-card p-6">
            <h3 className="text-lg">Most prayed for</h3>
            <ul className="mt-4 space-y-3">
              {popular.prayers.map((prayer) => (
                <li key={prayer.id} className="text-sm">
                  <p className="font-semibold text-foreground">{prayer.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{prayer.prayerCount} prayers</p>
                </li>
              ))}
              {popular.prayers.length === 0 && (
                <li className="text-sm text-muted-foreground">Nothing yet.</li>
              )}
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription className="font-semibold">{label}</CardDescription>
        <CardTitle className="text-4xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  )
}
