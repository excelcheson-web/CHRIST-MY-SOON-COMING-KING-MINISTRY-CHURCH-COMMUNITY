import 'server-only'

import { ApprovalStatus, SermonStatus } from '@prisma/client'

import { legalDocs } from '@/content/legal'
import { staticPages } from '@/content/pages'
import { prisma } from '@/lib/prisma'

/**
 * Search across the parts of this site a visitor is allowed to read.
 *
 * ## What it deliberately does not search
 *
 * The community feed, the member directory, prayer requests, care requests and
 * chat. Not because it would be hard — because a search box is the fastest way
 * ever invented to turn a permission mistake into a leak. Everything here is
 * already public to anybody with the URL, so there is no visibility rule to
 * get wrong. If the community is ever searchable it needs its own signed-in
 * endpoint with the viewer's scopes applied per row, not a filter bolted onto
 * this one.
 *
 * ## Why Postgres `contains` rather than full-text search
 *
 * A church has hundreds of sermons, not millions of documents. `ILIKE` across
 * a few columns answers in single-digit milliseconds at that size, works on
 * any PostgreSQL without an extension or a migration, and needs no index to
 * maintain. Postgres full-text or an external search service is the right
 * answer at a scale this site will not reach — and either can be dropped in
 * behind this function without changing a caller.
 */

export type SearchResultKind = 'sermon' | 'testimony' | 'page' | 'event'

export type SearchResult = {
  kind: SearchResultKind
  title: string
  href: string
  /** One line of context — why this matched. */
  excerpt: string
  /** Sorted on, newest first within a kind. Absent for static pages. */
  when: string | null
}

/** Longest run of the query found in the text, with a little either side. */
function excerptAround(text: string | null | undefined, query: string, length = 160): string {
  if (!text) return ''
  const flat = text.replace(/\s+/g, ' ').trim()
  const at = flat.toLowerCase().indexOf(query.toLowerCase())
  if (at === -1) return flat.slice(0, length) + (flat.length > length ? '…' : '')

  const from = Math.max(0, at - 60)
  const slice = flat.slice(from, from + length)
  return (from > 0 ? '…' : '') + slice + (from + length < flat.length ? '…' : '')
}

/** The bundled pages, searched in memory — there are only a handful. */
function searchStaticContent(query: string): SearchResult[] {
  const needle = query.toLowerCase()
  const results: SearchResult[] = []

  for (const page of staticPages) {
    const haystack = `${page.title} ${page.subtitle} ${page.content}`.toLowerCase()
    if (!haystack.includes(needle)) continue
    results.push({
      kind: 'page',
      title: page.title,
      href: `/${page.slug}`,
      excerpt: excerptAround(page.content, query),
      when: null,
    })
  }

  for (const doc of legalDocs) {
    const haystack = `${doc.title} ${doc.summary} ${doc.body}`.toLowerCase()
    if (!haystack.includes(needle)) continue
    results.push({
      kind: 'page',
      title: doc.title,
      href: `/${doc.slug}`,
      excerpt: excerptAround(doc.body, query),
      when: null,
    })
  }

  return results
}

export async function search(rawQuery: string, take = 30): Promise<SearchResult[]> {
  const query = rawQuery.trim().slice(0, 100)
  // Two characters matches half the site and helps nobody.
  if (query.length < 2) return []

  const results: SearchResult[] = searchStaticContent(query)

  if (prisma) {
    const like = { contains: query, mode: 'insensitive' as const }

    try {
      const [sermons, testimonies, events] = await Promise.all([
        prisma.sermon.findMany({
          where: {
            status: SermonStatus.PUBLISHED,
            OR: [
              { title: like },
              { description: like },
              { speaker: like },
              { biblePassage: like },
              { transcript: like },
            ],
          },
          select: {
            title: true,
            slug: true,
            description: true,
            speaker: true,
            preachedAt: true,
          },
          orderBy: { preachedAt: 'desc' },
          take,
        }),

        prisma.testimony.findMany({
          where: {
            status: ApprovalStatus.APPROVED,
            OR: [{ title: like }, { content: like }],
          },
          select: { id: true, slug: true, title: true, content: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take,
        }),

        prisma.event.findMany({
          where: {
            status: 'PUBLISHED',
            OR: [{ title: like }, { description: like }, { locationName: like }],
          },
          select: { title: true, slug: true, description: true, startsAt: true },
          orderBy: { startsAt: 'asc' },
          take,
        }),
      ])

      for (const sermon of sermons) {
        results.push({
          kind: 'sermon',
          title: sermon.title,
          href: `/sermons/${sermon.slug}`,
          excerpt: excerptAround(sermon.description ?? sermon.speaker, query),
          when: sermon.preachedAt.toISOString(),
        })
      }

      for (const testimony of testimonies) {
        results.push({
          kind: 'testimony',
          title: testimony.title,
          href: `/prayer/testimonies#${testimony.slug}`,
          excerpt: excerptAround(testimony.content, query),
          when: testimony.createdAt.toISOString(),
        })
      }

      for (const event of events) {
        results.push({
          kind: 'event',
          title: event.title,
          href: `/events/${event.slug}`,
          excerpt: excerptAround(event.description, query),
          when: event.startsAt.toISOString(),
        })
      }
    } catch (error) {
      // The bundled pages already matched, so a database wobble narrows the
      // results rather than emptying them.
      console.error('[search]', error)
    }
  }

  /*
   * A title match beats a body match. Somebody typing "harvest" wants the
   * sermon called Harvest before a sermon that mentions harvest in passing,
   * and no amount of recency ordering fixes that.
   */
  const needle = query.toLowerCase()
  return results
    .sort((a, b) => {
      const aTitle = a.title.toLowerCase().includes(needle) ? 0 : 1
      const bTitle = b.title.toLowerCase().includes(needle) ? 0 : 1
      if (aTitle !== bTitle) return aTitle - bTitle
      if (a.when && b.when) return b.when.localeCompare(a.when)
      return a.when ? -1 : b.when ? 1 : 0
    })
    .slice(0, take)
}
