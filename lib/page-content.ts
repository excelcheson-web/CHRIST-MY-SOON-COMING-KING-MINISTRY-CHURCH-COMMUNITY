import 'server-only'

import { cache } from 'react'

import { staticPagesBySlug, type StaticPage } from '@/content/pages'
import { prisma } from '@/lib/prisma'

export type PageSlug = StaticPage['slug']

export type ResolvedPage = {
  slug: PageSlug
  title: string
  subtitle: string
  content: string
  meta: Record<string, unknown>
  updatedAt: Date | null
  /** Where the copy came from — surfaced to admins so edits are traceable. */
  source: 'database' | 'bundled'
}

function fromStatic(slug: PageSlug): ResolvedPage {
  const page = staticPagesBySlug[slug]
  return {
    slug,
    title: page.title,
    subtitle: page.subtitle,
    content: page.content,
    meta: (page.meta ?? {}) as Record<string, unknown>,
    updatedAt: null,
    source: 'bundled',
  }
}

/**
 * Database copy wins when it exists; bundled content is the safety net.
 *
 * A database hiccup must never take the public site down, so every failure
 * mode here — no DATABASE_URL, no migration yet, network blip — degrades to
 * the bundled copy instead of throwing.
 */
export const getPageContent = cache(async (slug: PageSlug): Promise<ResolvedPage> => {
  if (!prisma) return fromStatic(slug)

  try {
    const record = await prisma.pageContent.findUnique({ where: { slug } })
    if (!record || !record.published) return fromStatic(slug)

    return {
      slug,
      title: record.title,
      subtitle: record.subtitle ?? staticPagesBySlug[slug].subtitle,
      content: record.content,
      meta: (record.meta as Record<string, unknown> | null) ?? {},
      updatedAt: record.updatedAt,
      source: 'database',
    }
  } catch (error) {
    console.error(`[page-content] falling back to bundled copy for "${slug}":`, error)
    return fromStatic(slug)
  }
})
