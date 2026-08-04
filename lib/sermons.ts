import { Prisma, SermonStatus } from '@prisma/client'

import { isPlayableAudio, toEmbed } from '@/lib/embed'

/**
 * Sermon Centre helpers — query shapes, filters and formatting.
 *
 * Link handling lives in `lib/embed.ts` instead, because the player runs in the
 * browser and this module imports `@prisma/client`. Both are re-exported below
 * so server callers only need one import.
 */

export { isPlayableAudio, toEmbed }

/** "42 min" · "1 hr 5 min". Nulls out rather than printing "0 min". */
export function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`
}

export function formatSermonDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export const sermonStatusLabels: Record<SermonStatus, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
}

/**
 * What a visitor is allowed to see.
 *
 * Drafts are unfinished and archived sermons were deliberately taken down, so
 * neither belongs on a public page. Content managers get everything.
 */
export function sermonWhere(canManage: boolean): Prisma.SermonWhereInput {
  return canManage ? {} : { status: SermonStatus.PUBLISHED }
}

/**
 * Search, topic and series filters combined into one `where`.
 *
 * `mode: 'insensitive'` on every text field — nobody searching for "grace"
 * should miss a sermon titled "Grace".
 */
export function sermonFilterWhere(filters: {
  q?: string
  series?: string
  speaker?: string
  topic?: string
}): Prisma.SermonWhereInput {
  const clauses: Prisma.SermonWhereInput[] = []

  const q = filters.q?.trim()
  if (q) {
    clauses.push({
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { speaker: { contains: q, mode: 'insensitive' } },
        { biblePassage: { contains: q, mode: 'insensitive' } },
        // Postgres array containment — exact tag match, which is what people expect.
        { topics: { has: q.toLowerCase() } },
        { tags: { has: q.toLowerCase() } },
      ],
    })
  }

  if (filters.series) clauses.push({ series: { slug: filters.series } })
  if (filters.speaker) clauses.push({ speaker: filters.speaker })
  if (filters.topic) clauses.push({ topics: { has: filters.topic.toLowerCase() } })

  return clauses.length > 0 ? { AND: clauses } : {}
}

export const sermonCardSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  speaker: true,
  speakerImage: true,
  biblePassage: true,
  preachedAt: true,
  duration: true,
  videoUrl: true,
  audioUrl: true,
  image: true,
  topics: true,
  status: true,
  isFeatured: true,
  viewCount: true,
  likeCount: true,
  series: { select: { title: true, slug: true } },
} satisfies Prisma.SermonSelect

export type SermonRecord = Prisma.SermonGetPayload<{ select: typeof sermonCardSelect }>

export type SermonCard = {
  slug: string
  title: string
  description: string | null
  speaker: string
  speakerImage: string | null
  biblePassage: string | null
  date: string
  dateISO: string
  duration: string | null
  hasVideo: boolean
  hasAudio: boolean
  image: string | null
  topics: string[]
  seriesTitle: string | null
  seriesSlug: string | null
  status: SermonStatus
  isFeatured: boolean
  viewCount: number
}

export function toSermonCard(record: SermonRecord): SermonCard {
  return {
    slug: record.slug,
    title: record.title,
    description: record.description,
    speaker: record.speaker,
    speakerImage: record.speakerImage,
    biblePassage: record.biblePassage,
    date: formatSermonDate(record.preachedAt),
    dateISO: record.preachedAt.toISOString(),
    duration: formatDuration(record.duration),
    hasVideo: Boolean(toEmbed(record.videoUrl)),
    hasAudio: isPlayableAudio(record.audioUrl),
    image: record.image,
    topics: record.topics,
    seriesTitle: record.series?.title ?? null,
    seriesSlug: record.series?.slug ?? null,
    status: record.status,
    isFeatured: record.isFeatured,
    viewCount: record.viewCount,
  }
}

/**
 * A handful of topics the church actually preaches on, offered as chips.
 *
 * Free text is still allowed — this list only exists so the filter row has
 * something in it before anyone has tagged a hundred sermons.
 */
export const suggestedTopics = [
  'faith',
  'grace',
  'prayer',
  'family',
  'hope',
  'healing',
  'forgiveness',
  'holy spirit',
  'evangelism',
  'worship',
  'end times',
  'discipleship',
] as const
