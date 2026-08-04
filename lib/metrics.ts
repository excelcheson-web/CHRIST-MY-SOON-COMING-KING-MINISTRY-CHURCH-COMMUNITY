import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * Community health, for the people who shepherd it.
 *
 * Everything here is aggregate — counts, hours, totals. The one screen that
 * names individuals is the quiet-member list, and that exists so somebody gets
 * a phone call, which is the whole point of noticing.
 *
 * Deliberately **not** built: sentiment analysis over members' posts. Scanning
 * what people write for distress needs an AI provider this deployment does not
 * have, and more importantly it is the kind of thing a church should decide to
 * do on purpose rather than find switched on. The quiet-member list catches
 * most of the same people without reading anybody's words.
 */

export type HeatCell = { day: number; hour: number; count: number }

/**
 * When the church is actually online, from post timestamps.
 *
 * One query, bucketed in JavaScript rather than in SQL, because the alternative
 * is a raw query per database dialect and this runs on at most a few thousand
 * rows.
 */
export async function engagementHeatmap(sinceDays = 60): Promise<HeatCell[]> {
  if (!prisma) return []

  const since = new Date(Date.now() - sinceDays * 86_400_000)

  try {
    const [posts, comments] = await Promise.all([
      prisma.post.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
        take: 5000,
      }),
      prisma.postComment.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        select: { createdAt: true },
        take: 5000,
      }),
    ])

    const buckets = new Map<string, number>()
    for (const row of [...posts, ...comments]) {
      const key = `${row.createdAt.getDay()}:${row.createdAt.getHours()}`
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    const cells: HeatCell[] = []
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        cells.push({ day, hour, count: buckets.get(`${day}:${hour}`) ?? 0 })
      }
    }
    return cells
  } catch (error) {
    console.error('[heatmap]', error)
    return []
  }
}

/** What people actually engaged with, so the next thing can be more of it. */
export async function popularContent(sinceDays = 30) {
  if (!prisma) return { posts: [], sermons: [], prayers: [] }

  const since = new Date(Date.now() - sinceDays * 86_400_000)

  try {
    const [posts, sermons, prayers] = await Promise.all([
      prisma.post.findMany({
        where: { createdAt: { gte: since }, deletedAt: null },
        orderBy: [{ commentCount: 'desc' }, { likeCount: 'desc' }],
        take: 8,
        select: {
          id: true,
          body: true,
          channel: true,
          commentCount: true,
          createdAt: true,
          author: { select: { name: true } },
          _count: { select: { reactions: true } },
        },
      }),
      prisma.sermon.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { viewCount: 'desc' },
        take: 6,
        select: { slug: true, title: true, speaker: true, viewCount: true },
      }),
      prisma.prayerRequest.findMany({
        where: { createdAt: { gte: since }, visibility: 'PUBLIC' },
        orderBy: { prayerCount: 'desc' },
        take: 6,
        select: { id: true, title: true, prayerCount: true },
      }),
    ])

    return { posts, sermons, prayers }
  } catch (error) {
    console.error('[popular]', error)
    return { posts: [], sermons: [], prayers: [] }
  }
}

/** Headline counts for the community dashboard. */
export async function communityTotals(sinceDays = 30) {
  if (!prisma) {
    return { members: 0, active: 0, posts: 0, reactions: 0, helpOpen: 0, initiatives: 0 }
  }

  const since = new Date(Date.now() - sinceDays * 86_400_000)

  try {
    const [members, active, posts, reactions, helpOpen, initiatives] = await Promise.all([
      prisma.user.count({ where: { bannedAt: null } }),
      prisma.memberProfile.count({ where: { lastActiveAt: { gte: since } } }),
      prisma.post.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
      prisma.postReaction.count({ where: { createdAt: { gte: since } } }),
      prisma.helpPost.count({ where: { status: { in: ['OPEN', 'CLAIMED'] } } }),
      prisma.initiative.count({ where: { isActive: true } }),
    ])

    return { members, active, posts, reactions, helpOpen, initiatives }
  } catch (error) {
    console.error('[totals]', error)
    return { members: 0, active: 0, posts: 0, reactions: 0, helpOpen: 0, initiatives: 0 }
  }
}
