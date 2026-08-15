import { LOGO_SRC, LOGO_SIZE } from '@/lib/brand-assets'
// Types only from `site-settings` — a type import is erased at compile time,
// so this module stays free of that one's `server-only` marker and can be
// exercised on its own. `hasSocial` comes from the plain config module.
import { hasSocial } from '@/lib/site'
import type { ServiceTime, SiteSettings } from '@/lib/site-settings'

/**
 * Structured data — what turns a blue link into a result with the service
 * times, the address and a map pin attached to it.
 *
 * ## Why this file exists
 *
 * A church competes for one kind of search and one only: somebody nearby, or
 * somebody who already half-knows the name, looking for *this* church. Nobody
 * reaches a local congregation by ranking for "God". What decides whether the
 * ministry is found is whether a search engine can answer three questions
 * without guessing — **who are you, where are you, when are you open** — and
 * that is exactly what schema.org markup states outright rather than leaving
 * to be inferred from prose.
 *
 * Everything here is built from the live admin settings, so a church that
 * moves premises or changes its Sunday time fixes its search results by
 * editing the settings form, not by calling a developer.
 *
 * ## The one rule
 *
 * **Never emit a field we are not sure of.** Structured data that disagrees
 * with the visible page is a manual-action risk, and a half-built object with
 * `undefined` in it is worse than no object at all. Every builder below drops
 * a field it cannot fill honestly, which is why they are written as "build an
 * object, then prune" rather than as one big literal.
 */

/** JSON-LD is an untyped document format; this is as precise as it gets. */
export type JsonLdObject = Record<string, unknown>

/** Absolute URLs everywhere. Schema.org consumers do not resolve relative ones. */
export function absoluteUrl(siteUrl: string, path = ''): string {
  const base = siteUrl.replace(/\/$/, '')
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/**
 * Drops keys whose value is `undefined`, `null`, `''` or `[]`, recursively.
 *
 * The builders below stay readable by assigning fields unconditionally and
 * letting this take out the ones that turned out to be empty. Without it a
 * church with no Instagram account would publish `"sameAs": [undefined]`.
 */
function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const cleaned = value.map(prune).filter((entry) => entry !== undefined && entry !== null)
    return cleaned as unknown as T
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>
    const cleaned: Record<string, unknown> = {}
    for (const [key, raw] of Object.entries(source)) {
      const next = prune(raw)
      if (next === undefined || next === null) continue
      if (typeof next === 'string' && next.trim() === '') continue
      if (Array.isArray(next) && next.length === 0) continue
      cleaned[key] = next
    }
    return cleaned as unknown as T
  }
  return value
}

/**
 * "9:00 AM – 1:00 PM" → `{ opens: '09:00', closes: '13:00' }`.
 *
 * Tolerates an en dash, an em dash or a hyphen, a missing `:00`, and either
 * case of am/pm, because this string is typed by hand into an admin form and
 * every one of those variants has been typed into one before. Anything it
 * cannot read with confidence returns `null` and the entry is dropped — a
 * wrong opening time sends somebody to a locked building, which is a worse
 * outcome than a search result with no time on it at all.
 */
function parseTimeRange(time: string): { opens: string; closes: string } | null {
  const parts = time.split(/[–—-]/)
  if (parts.length !== 2) return null

  const to24Hour = (raw: string): string | null => {
    const match = raw.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
    if (!match) return null

    let hour = Number(match[1])
    const minute = Number(match[2] ?? 0)
    const meridiem = match[3]?.toLowerCase()

    if (hour > 23 || minute > 59) return null
    if (meridiem === 'pm' && hour < 12) hour += 12
    if (meridiem === 'am' && hour === 12) hour = 0

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }

  const opens = to24Hour(parts[0])
  const closes = to24Hour(parts[1])
  return opens && closes ? { opens, closes } : null
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

/**
 * Service times as opening hours.
 *
 * This is the single highest-value thing on the page for a church. It is what
 * lets a search engine answer "churches open Sunday morning near me" — a
 * question people genuinely type — and it is the difference between a result
 * that shows a time and one that does not.
 */
function openingHours(serviceTimes: ServiceTime[]): JsonLdObject[] {
  return serviceTimes
    .map((service): JsonLdObject | null => {
      const day = DAYS.find((name) => name.toLowerCase() === service.day.trim().toLowerCase())
      const range = parseTimeRange(service.time)
      if (!day || !range) return null

      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${day}`,
        opens: range.opens,
        closes: range.closes,
        name: service.label,
      }
    })
    .filter((entry): entry is JsonLdObject => entry !== null)
}

/**
 * The country the ministry meets in, as an ISO 3166-1 alpha-2 code.
 *
 * A constant rather than something parsed out of the address line: the address
 * is a free-text admin field, and guessing a country from the end of it would
 * one day publish the wrong one. Change this if the church ever moves country.
 */
const ADDRESS_COUNTRY = 'NG'

/**
 * Splits the admin's one-line address into the parts schema.org wants.
 *
 * "8 Awoni Murphy Street, Haruna Bus Stop, College Road, Ogba, Lagos" becomes
 * street "8 Awoni Murphy Street, Haruna Bus Stop, College Road", locality
 * "Ogba", region "Lagos" — which is the convention every Nigerian address
 * written on one line already follows. Short addresses degrade sensibly: with
 * fewer than three parts the whole string stays in `streetAddress`, which is
 * valid and simply less specific.
 */
function postalAddress(address: string): JsonLdObject | undefined {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length === 0) return undefined

  if (parts.length < 3) {
    return {
      '@type': 'PostalAddress',
      streetAddress: parts.join(', '),
      addressCountry: ADDRESS_COUNTRY,
    }
  }

  return {
    '@type': 'PostalAddress',
    streetAddress: parts.slice(0, -2).join(', '),
    addressLocality: parts[parts.length - 2],
    addressRegion: parts[parts.length - 1],
    addressCountry: ADDRESS_COUNTRY,
  }
}

/**
 * What this ministry is about, as entities rather than as a keyword stuffing.
 *
 * `knowsAbout` is read by entity-extraction systems and is the legitimate home
 * for the subject terms — deliverance, salvation, the Holy Spirit. The old
 * `<meta name="keywords">` tag these would once have gone in has been ignored
 * by Google since 2009 and is not worth arguing with; this is where the same
 * intent belongs now.
 */
const MINISTRY_TOPICS = [
  'Christianity',
  'Church',
  'Christian worship',
  'Salvation',
  'Deliverance ministry',
  'Holy Spirit',
  'Prayer',
  'Christian discipleship',
  'Bible study',
  'Pentecostalism',
  'Gospel',
  'Healing ministry',
  'Christian fellowship',
]

/** A stable identifier so other schema objects can point at the church. */
export function churchId(siteUrl: string): string {
  return `${absoluteUrl(siteUrl)}/#church`
}

/**
 * The ministry itself. The anchor every other object on the site refers back to.
 *
 * `Church` rather than the broader `Organization` — it is a recognised
 * schema.org type and it inherits `LocalBusiness`, which is what carries the
 * address and opening hours that local search actually runs on.
 */
export function churchSchema(settings: SiteSettings): JsonLdObject {
  const url = absoluteUrl(settings.url)
  const logo = absoluteUrl(settings.url, LOGO_SRC)

  const sameAs = [settings.socials.facebook, settings.socials.youtube, settings.socials.instagram]
    .filter(hasSocial)

  return prune({
    '@context': 'https://schema.org',
    '@type': 'Church',
    '@id': churchId(settings.url),
    name: settings.legalName,
    // A search for "Praise Arena" or "CMSCK" has to find the church under its
    // proper name, so both live here rather than replacing `name`.
    alternateName: [settings.aka, settings.shortName].filter(Boolean),
    description: settings.description,
    slogan: settings.tagline,
    url,
    logo: { '@type': 'ImageObject', url: logo, width: LOGO_SIZE, height: LOGO_SIZE },
    image: logo,
    email: settings.contact.email,
    telephone: settings.contact.phone,
    address: postalAddress(settings.contact.address),
    openingHoursSpecification: openingHours(settings.serviceTimes),
    sameAs,
    knowsAbout: MINISTRY_TOPICS,
    // The ministry was founded in 2015 by Dr Prophet Samuel Orji — stated in
    // the About and Founder pages, so it is safe to assert here too.
    foundingDate: '2015',
    areaServed: { '@type': 'AdministrativeArea', name: 'Lagos, Nigeria' },
    isAccessibleForFree: true,
    publicAccess: true,
  })
}

/**
 * The site as a thing in its own right, with a search action.
 *
 * The `SearchAction` is what can earn a sitelinks search box under the main
 * result — a search field for this site, inside Google's own result. It points
 * at `/search`, which already exists and already handles `?q=`.
 */
export function websiteSchema(settings: SiteSettings): JsonLdObject {
  const url = absoluteUrl(settings.url)

  return prune({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name: settings.name,
    alternateName: settings.aka,
    description: settings.description,
    url,
    publisher: { '@id': churchId(settings.url) },
    inLanguage: 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  })
}

/**
 * Breadcrumbs, which search engines render in place of the raw URL.
 *
 * "cmsck.org › Sermons › Freedom From Fear" reads as a place in a structure;
 * the URL it replaces reads as a string. Pass the trail without the current
 * page's own link — `item` is omitted on the last entry, as the spec requires.
 */
export function breadcrumbSchema(
  siteUrl: string,
  trail: { name: string; path?: string }[],
): JsonLdObject {
  return prune({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.path ? absoluteUrl(siteUrl, crumb.path) : undefined,
    })),
  })
}

export type EventSchemaInput = {
  title: string
  slug: string
  description: string | null
  startsAt: Date
  endsAt: Date | null
  locationName: string | null
  address: string | null
  isOnline: boolean
  onlineUrl: string | null
  price: number
  currency: string
  image: string | null
  cancelled: boolean
}

/**
 * An event, in the form that can appear as a rich result with a date on it.
 *
 * Worth the effort: event rich results are one of the few remaining formats
 * that visibly change how a listing looks in search, and a church's events are
 * the pages most worth being found — a carol service or a deliverance night is
 * searched for by people who are not looking for the church itself.
 *
 * `price` arrives in minor units (see the Prisma model) and schema.org wants
 * major units, hence the division. Free events still publish an `offers` block
 * with price "0": that is what makes a result say *Free*.
 */
export function eventSchema(event: EventSchemaInput, settings: SiteSettings): JsonLdObject {
  const url = absoluteUrl(settings.url, `/events/${event.slug}`)

  const physicalLocation = {
    '@type': 'Place',
    name: event.locationName ?? settings.name,
    address: postalAddress(event.address ?? settings.contact.address),
  }

  /*
   * Three shapes, not two. An event that is online *and* has a venue is a
   * hybrid one, and saying so is what stops a search engine showing "online
   * only" to somebody who could have walked there.
   */
  const location = event.isOnline
    ? event.locationName || event.address
      ? [physicalLocation, { '@type': 'VirtualLocation', url: event.onlineUrl ?? url }]
      : { '@type': 'VirtualLocation', url: event.onlineUrl ?? url }
    : physicalLocation

  const attendanceMode = event.isOnline
    ? event.locationName || event.address
      ? 'https://schema.org/MixedEventAttendanceMode'
      : 'https://schema.org/OnlineEventAttendanceMode'
    : 'https://schema.org/OfflineEventAttendanceMode'

  return prune({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description ?? undefined,
    url,
    startDate: event.startsAt.toISOString(),
    endDate: event.endsAt?.toISOString(),
    eventStatus: event.cancelled
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: attendanceMode,
    location,
    image: event.image ? absoluteUrl(settings.url, event.image) : absoluteUrl(settings.url, LOGO_SRC),
    organizer: {
      '@type': 'Church',
      '@id': churchId(settings.url),
      name: settings.legalName,
      url: absoluteUrl(settings.url),
    },
    offers: {
      '@type': 'Offer',
      price: (event.price / 100).toFixed(2),
      priceCurrency: event.currency,
      availability: 'https://schema.org/InStock',
      url,
      validFrom: new Date().toISOString(),
    },
  })
}

export type SermonSchemaInput = {
  title: string
  slug: string
  description: string | null
  speaker: string
  preachedAt: Date
  updatedAt: Date
  duration: number | null
  videoUrl: string | null
  audioUrl: string | null
  image: string | null
  topics: string[]
  tags: string[]
  biblePassage: string | null
}

/**
 * A sermon, typed as whatever it actually is.
 *
 * `VideoObject` when there is a video, `AudioObject` when it is audio only,
 * and a plain `Article` when it is neither — a written message with notes and
 * a transcript is still an article and still worth marking up. Typing a
 * text-only page as a video would be a false claim about the page's content,
 * which is precisely the kind of mismatch that earns a structured-data penalty.
 */
export function sermonSchema(sermon: SermonSchemaInput, settings: SiteSettings): JsonLdObject {
  const url = absoluteUrl(settings.url, `/sermons/${sermon.slug}`)
  const image = sermon.image
    ? absoluteUrl(settings.url, sermon.image)
    : absoluteUrl(settings.url, LOGO_SRC)

  const description =
    sermon.description ??
    `${sermon.title} — a message by ${sermon.speaker}${
      sermon.biblePassage ? ` from ${sermon.biblePassage}` : ''
    }.`

  const shared = {
    '@context': 'https://schema.org',
    name: sermon.title,
    headline: sermon.title,
    description,
    url,
    // ISO 8601 duration. Minutes in the database, "PT42M" in the markup.
    duration: sermon.duration ? `PT${sermon.duration}M` : undefined,
    keywords: [...sermon.topics, ...sermon.tags].join(', '),
    inLanguage: 'en',
    isFamilyFriendly: true,
    author: { '@type': 'Person', name: sermon.speaker },
    publisher: { '@id': churchId(settings.url) },
    about: sermon.biblePassage ?? undefined,
  }

  if (sermon.videoUrl) {
    return prune({
      ...shared,
      '@type': 'VideoObject',
      thumbnailUrl: image,
      uploadDate: sermon.preachedAt.toISOString(),
      embedUrl: sermon.videoUrl,
      contentUrl: sermon.videoUrl,
    })
  }

  if (sermon.audioUrl) {
    return prune({
      ...shared,
      '@type': 'AudioObject',
      uploadDate: sermon.preachedAt.toISOString(),
      contentUrl: sermon.audioUrl,
      encodingFormat: 'audio/mpeg',
    })
  }

  return prune({
    ...shared,
    '@type': 'Article',
    image,
    datePublished: sermon.preachedAt.toISOString(),
    dateModified: sermon.updatedAt.toISOString(),
  })
}
