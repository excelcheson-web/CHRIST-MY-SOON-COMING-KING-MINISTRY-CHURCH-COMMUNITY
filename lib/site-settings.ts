import 'server-only'

import { cache } from 'react'

import { prisma } from '@/lib/prisma'
import { siteConfig } from '@/lib/site'

/**
 * Ministry identity, resolved database-first with the bundled file as the
 * safety net — the same pattern as page content and the curriculum.
 *
 * `siteConfig` in `lib/site.ts` stays as the seed and the fallback. Once an
 * administrator saves the settings form, the database wins. Nothing here can
 * throw: a settings hiccup must never take the header down.
 */

export type ServiceTime = { day: string; label: string; time: string }
export type Socials = { facebook: string; youtube: string; instagram: string }

export type SiteSettings = {
  name: string
  legalName: string
  shortName: string
  /** The slogan the ministry is also known by. Never replaces `name`. */
  aka: string
  tagline: string
  description: string
  url: string
  contact: { email: string; phone: string; address: string }
  serviceTimes: ServiceTime[]
  socials: Socials
  /** Where the values came from — shown to admins so edits are traceable. */
  source: 'database' | 'bundled'
}

/** The compiled-in defaults, in the resolved shape. */
export function fallbackSettings(): SiteSettings {
  return {
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    shortName: siteConfig.shortName,
    aka: siteConfig.aka,
    tagline: siteConfig.tagline,
    description: siteConfig.description,
    url: siteConfig.url,
    contact: { ...siteConfig.contact },
    serviceTimes: siteConfig.serviceTimes.map((entry) => ({ ...entry })),
    socials: { ...siteConfig.socials },
    source: 'bundled',
  }
}

/** Json columns are `unknown` to TypeScript; coerce defensively. */
function asServiceTimes(value: unknown, fallback: ServiceTime[]): ServiceTime[] {
  if (!Array.isArray(value)) return fallback
  const parsed = value
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      day: String(row.day ?? ''),
      label: String(row.label ?? ''),
      time: String(row.time ?? ''),
    }))
    .filter((row) => row.day || row.time)
  return parsed.length > 0 ? parsed : fallback
}

/*
 * Re-exported from `lib/site.ts`, where it now lives — this module is
 * `server-only`, and a one-line predicate about social links had no business
 * dragging that constraint into everything that needed it. Existing importers
 * carry on working unchanged.
 */
export { hasSocial } from '@/lib/site'

function asSocials(value: unknown, fallback: Socials): Socials {
  if (typeof value !== 'object' || value === null) return fallback
  const row = value as Record<string, unknown>
  return {
    facebook: String(row.facebook ?? fallback.facebook),
    youtube: String(row.youtube ?? fallback.youtube),
    instagram: String(row.instagram ?? fallback.instagram),
  }
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const fallback = fallbackSettings()
  if (!prisma) return fallback

  try {
    const row = await prisma.siteSetting.findUnique({ where: { id: 'singleton' } })
    if (!row) return fallback

    return {
      name: row.name,
      legalName: row.legalName,
      shortName: row.shortName,
      // Older rows predate this column's default; never let it render blank.
      aka: row.aka || fallback.aka,
      tagline: row.tagline,
      description: row.description,
      // The public URL stays an environment concern, not an editable field —
      // getting it wrong would break every canonical link and OG tag.
      url: fallback.url,
      contact: {
        email: row.contactEmail,
        phone: row.contactPhone,
        address: row.contactAddress,
      },
      serviceTimes: asServiceTimes(row.serviceTimes, fallback.serviceTimes),
      socials: asSocials(row.socials, fallback.socials),
      source: 'database',
    }
  } catch (error) {
    console.error('[site-settings] falling back to bundled config:', error)
    return fallback
  }
})
