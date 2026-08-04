import 'server-only'

/**
 * Reading the ministry's YouTube channel — without an API key, and without a
 * bill.
 *
 * ## Why the RSS feed and not the Data API
 *
 * The YouTube Data API needs a Google Cloud project, an API key to keep secret
 * and rotate, and a quota that a church will one day exceed on a Sunday
 * morning. The channel's Atom feed at `/feeds/videos.xml` needs none of those:
 * it is public, it is free, it has no quota, and it returns the last fifteen
 * uploads with their ids, titles, descriptions and publication dates — which is
 * everything needed to turn an upload into a sermon.
 *
 * The trade is that fifteen is all you get, and there is no duration or view
 * count. Both are acceptable: a church imports as it uploads, and duration can
 * be filled in by hand on the rare occasion anybody cares.
 *
 * ## Handles, and why resolving one is a separate step
 *
 * The feed is keyed by channel id (`UC…`), and what a church has is a handle
 * (`@theirname`). There is no public endpoint that converts one to the other,
 * so `resolveChannelId` fetches the channel page and reads the id out of the
 * markup. That is fragile by nature, so the resolved id is cached in
 * `SiteSetting.youtubeChannelId` and the scrape only runs when it is missing.
 */

const FEED = 'https://www.youtube.com/feeds/videos.xml?channel_id='
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/

export type ChannelVideo = {
  /** The YouTube video id — this is what makes the sermon unique. */
  videoId: string
  title: string
  description: string
  publishedAt: Date
  /** Watch link, for the sermon's `videoUrl`. */
  url: string
  thumbnail: string
}

/** A YouTube URL, handle or bare id, reduced to a channel id. */
export async function resolveChannelId(input: string): Promise<string | null> {
  const trimmed = input.trim()
  if (CHANNEL_ID.test(trimmed)) return trimmed

  // Accept a handle with or without the surrounding URL.
  const handle = trimmed.match(/@([\w.-]+)/)?.[1]
  const fromPath = trimmed.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/)?.[1]
  if (fromPath) return fromPath
  if (!handle) return null

  try {
    const response = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: {
        // Without a browser-ish agent YouTube serves a consent interstitial
        // that carries no channel id at all.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36',
        'accept-language': 'en',
      },
      next: { revalidate: 86_400 },
    })
    if (!response.ok) return null

    const html = await response.text()
    const id =
      html.match(/"externalId":"(UC[A-Za-z0-9_-]{22})"/)?.[1] ??
      html.match(/"channelId":"(UC[A-Za-z0-9_-]{22})"/)?.[1] ??
      null

    return id && CHANNEL_ID.test(id) ? id : null
  } catch (error) {
    console.error('[youtube] could not resolve channel', error)
    return null
  }
}

/** Everything between two tags, with entities decoded. */
function tagText(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  if (!match) return ''
  return decode(match[1] ?? '')
}

/**
 * Decodes the entities an Atom feed actually uses.
 *
 * `&amp;` is handled last, deliberately. Decoding it first would turn
 * `&amp;lt;` — which is a literal "&lt;" in the title — into `&lt;` and then
 * into a "<" that was never there.
 */
function decode(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&')
    .trim()
}

/**
 * The channel's most recent uploads, newest first.
 *
 * Parsed with regular expressions rather than an XML library on purpose: this
 * is one well-known feed with a fixed shape, and adding a parser dependency to
 * read four fields out of it would be the larger risk. Anything that does not
 * yield a plausible video id is skipped rather than guessed at.
 */
export async function fetchChannelVideos(channelId: string): Promise<ChannelVideo[]> {
  if (!CHANNEL_ID.test(channelId)) return []

  let xml: string
  try {
    const response = await fetch(`${FEED}${channelId}`, {
      // An hour: new uploads should appear without a deploy, but the admin
      // page must not hit YouTube on every keystroke either.
      next: { revalidate: 3600 },
    })
    if (!response.ok) {
      console.error('[youtube] feed returned', response.status)
      return []
    }
    xml = await response.text()
  } catch (error) {
    console.error('[youtube] feed unreachable', error)
    return []
  }

  const entries = xml.split('<entry>').slice(1)
  const videos: ChannelVideo[] = []

  for (const entry of entries) {
    const videoId = tagText(entry, 'yt:videoId')
    if (!/^[\w-]{6,20}$/.test(videoId)) continue

    const published = tagText(entry, 'published')
    const publishedAt = new Date(published)
    if (Number.isNaN(publishedAt.getTime())) continue

    videos.push({
      videoId,
      title: tagText(entry, 'title') || 'Untitled',
      description: tagText(entry, 'media:description'),
      publishedAt,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      // Fixed URL shape, always present, and never hotlinked into the page —
      // the admin picker is the only thing that shows it.
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    })
  }

  return videos
}

/**
 * Does this upload look like a Short rather than a message?
 *
 * A church channel carries both, and a thirty-second clip filed as a sermon is
 * noise in the one place people go looking for teaching. This only *flags*
 * them — the admin decides — because the feed carries no duration and the tags
 * are the only signal there is.
 */
export function looksLikeShort(video: ChannelVideo) {
  const haystack = `${video.title} ${video.description}`.toLowerCase()
  return /#shorts?\b|#youtubeshorts\b/.test(haystack)
}
