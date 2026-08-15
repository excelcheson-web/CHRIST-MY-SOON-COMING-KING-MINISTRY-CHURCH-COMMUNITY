import { EventStatus, SermonStatus } from '@prisma/client'
import type { MetadataRoute } from 'next'

import { legalDocs } from '@/content/legal'
import { getCourses } from '@/lib/discipleship'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * The sitemap.
 *
 * ## Two rules it follows
 *
 * **Only list URLs a signed-out crawler gets a 200 from.** The whole
 * `/community` section sits behind the members' door — `middleware.ts` matches
 * `/community/:path*` and answers a crawler with a 307 to `/login`. It used to
 * be listed here anyway, which told Google the site was advertising pages it
 * would not then serve. Nothing under `/community` belongs in this file.
 *
 * **Tell the truth about dates.** Every entry once carried `lastModified: new
 * Date()`, so each fetch claimed the entire site had changed that second. A
 * crawler that is told everything changed always learns to believe none of it,
 * and the signal is worth more than the small effort of sourcing real dates —
 * so sermons and events carry their own `updatedAt`, and the pages whose copy
 * lives in the repository share the deploy date.
 */

/**
 * Rebuild the sitemap hourly.
 *
 * Without this Next prerenders it once at build time, and a sermon published
 * on Sunday afternoon would stay out of the sitemap until somebody happened to
 * deploy — which on a finished site could be months. An hour is frequent
 * enough that new content is discoverable the same day and cheap enough that
 * the two queries below run 24 times a day rather than on every crawl.
 */
export const revalidate = 3600

/*
 * When this build was made. Evaluated once at module load, which for this
 * route means once per deployment — exactly the honest answer for pages whose
 * content ships with the code.
 */
const BUILD_DATE = new Date()

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSiteSettings()
  const base = settings.url.replace(/\/$/, '')

  /*
   * `priority` is a hint about relative importance within this site, not a
   * ranking lever — it cannot make the site outrank anyone else's. It is set
   * to reflect what a visitor most often needs: how to be saved, when we meet,
   * what was preached.
   */
  const staticRoutes: {
    path: string
    priority: number
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  }[] = [
    { path: '', priority: 1, changeFrequency: 'daily' },
    { path: '/about', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/founder', priority: 0.8, changeFrequency: 'yearly' },
    { path: '/doctrine', priority: 0.8, changeFrequency: 'yearly' },
    { path: '/salvation', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/salvation/gospel', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/salvation/prayer', priority: 0.7, changeFrequency: 'yearly' },
    { path: '/discipleship', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/prayer', priority: 0.9, changeFrequency: 'daily' },
    { path: '/prayer/submit', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/prayer/groups', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/prayer/testimonies', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/prayer/testimonies/share', priority: 0.6, changeFrequency: 'yearly' },
    // Both listings change every time something is added to them, which for a
    // working church is most weeks.
    { path: '/events', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/sermons', priority: 0.9, changeFrequency: 'weekly' },
    /*
     * The information documents. Low priority — nobody searches for them — but
     * they must be indexable: a privacy policy a search engine cannot reach is
     * one an app store, a payment provider or a regulator cannot verify either.
     */
    { path: '/legal', priority: 0.4, changeFrequency: 'yearly' },
    ...legalDocs.map((doc) => ({
      path: `/${doc.slug}`,
      priority: 0.3,
      changeFrequency: 'yearly' as const,
    })),
  ]

  const courses = await getCourses()

  /*
   * Only published sermons. Drafts are unfinished and archived ones were taken
   * down deliberately — neither should be handed to a search engine.
   */
  const sermons = prisma
    ? await prisma.sermon
        .findMany({
          where: { status: SermonStatus.PUBLISHED },
          select: { slug: true, updatedAt: true },
          orderBy: { preachedAt: 'desc' },
          take: 500,
        })
        .catch(() => [])
    : []

  /*
   * Events were missing from this file entirely, which is the biggest single
   * omission it had: an event page is the most searchable thing a church
   * publishes, because people search for the meeting without knowing the
   * church. Past events stay listed — a completed event still answers "what
   * happened at that crusade" — but drafts never appear.
   */
  const events = prisma
    ? await prisma.event
        .findMany({
          where: { status: { in: [EventStatus.PUBLISHED, EventStatus.CANCELLED, EventStatus.COMPLETED] } },
          select: { slug: true, updatedAt: true },
          orderBy: { startsAt: 'desc' },
          take: 500,
        })
        .catch(() => [])
    : []

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(
    ({ path, priority, changeFrequency }) => ({
      url: `${base}${path}`,
      lastModified: BUILD_DATE,
      changeFrequency,
      priority,
    }),
  )

  const courseEntries: MetadataRoute.Sitemap = courses.flatMap((course) => [
    {
      url: `${base}/discipleship/${course.slug}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    ...course.weeks.map((week) => ({
      url: `${base}/discipleship/${course.slug}/week/${week.weekNumber}`,
      lastModified: BUILD_DATE,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...course.weeks.flatMap((week) =>
      week.lessons.map((lesson) => ({
        url: `${base}/discipleship/${course.slug}/lesson/${lesson.slug}`,
        lastModified: BUILD_DATE,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ),
  ])

  const sermonEntries: MetadataRoute.Sitemap = sermons.map((sermon) => ({
    url: `${base}/sermons/${sermon.slug}`,
    lastModified: sermon.updatedAt,
    // A sermon is finished when it is preached. It is not going to change.
    changeFrequency: 'yearly' as const,
    priority: 0.7,
  }))

  const eventEntries: MetadataRoute.Sitemap = events.map((event) => ({
    url: `${base}/events/${event.slug}`,
    lastModified: event.updatedAt,
    // Details, times and capacity move right up until the day.
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticEntries, ...courseEntries, ...sermonEntries, ...eventEntries]
}
