import { SermonStatus } from '@prisma/client'
import type { MetadataRoute } from 'next'

import { legalDocs } from '@/content/legal'
import { getCourses } from '@/lib/discipleship'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [now, settings] = [new Date(), await getSiteSettings()]

  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/about', priority: 0.8 },
    { path: '/founder', priority: 0.8 },
    { path: '/doctrine', priority: 0.8 },
    { path: '/salvation', priority: 0.9 },
    { path: '/salvation/gospel', priority: 0.7 },
    { path: '/salvation/prayer', priority: 0.7 },
    { path: '/discipleship', priority: 0.8 },
    { path: '/prayer', priority: 0.9 },
    { path: '/prayer/submit', priority: 0.8 },
    { path: '/prayer/groups', priority: 0.6 },
    { path: '/prayer/testimonies', priority: 0.7 },
    { path: '/prayer/testimonies/share', priority: 0.6 },
    { path: '/events', priority: 0.9 },
    { path: '/sermons', priority: 0.9 },
    // Listed but low priority: what is on it depends on who is signed in, so
    // most of the feed is not indexable content.
    { path: '/community', priority: 0.5 },
    /*
     * The information documents. Low priority — nobody searches for them — but
     * they must be indexable: a privacy policy a search engine cannot reach is
     * one an app store, a payment provider or a regulator cannot verify either.
     */
    { path: '/legal', priority: 0.4 },
    ...legalDocs.map((doc) => ({ path: `/${doc.slug}`, priority: 0.3 })),
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
          select: { slug: true },
          orderBy: { preachedAt: 'desc' },
          take: 500,
        })
        .catch(() => [])
    : []

  const courseRoutes = courses.flatMap((course) => [
    { path: `/discipleship/${course.slug}`, priority: 0.7 },
    ...course.weeks.map((week) => ({
      path: `/discipleship/${course.slug}/week/${week.weekNumber}`,
      priority: 0.5,
    })),
    ...course.weeks.flatMap((week) =>
      week.lessons.map((lesson) => ({
        path: `/discipleship/${course.slug}/lesson/${lesson.slug}`,
        priority: 0.6,
      })),
    ),
  ])

  const sermonRoutes = sermons.map((sermon) => ({
    path: `/sermons/${sermon.slug}`,
    priority: 0.7,
  }))

  return [...staticRoutes, ...courseRoutes, ...sermonRoutes].map(({ path, priority }) => ({
    url: `${settings.url}${path}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority,
  }))
}
