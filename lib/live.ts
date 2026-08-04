import 'server-only'

import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { resolveChannelId } from '@/lib/youtube'

/**
 * Is the church streaming right now?
 *
 * ## Fails to "no", always
 *
 * Every unknown answer here is treated as not live. A missing banner is a
 * small disappointment; a banner announcing a service that is not happening
 * sends people to an empty stream and makes the whole site look untrustworthy.
 * So there is no optimistic guessing anywhere below — nothing short of
 * YouTube saying `isLiveNow: true` counts.
 *
 * ## Why two requests
 *
 * `/channel/<id>/live` resolves to a watch URL whether or not a stream is
 * running — when nothing is live it points at the *most recent* past stream,
 * which is exactly the trap that produces a permanently stuck "we are live"
 * banner. The canonical link only tells us which video to ask about. The
 * answer comes from that video's own page, where `liveBroadcastDetails`
 * carries `isLiveNow`.
 *
 * ## This reads YouTube's markup, which YouTube may change
 *
 * There is no public, key-free API for "is this channel live". If the markers
 * below stop matching, this returns "not live" and the banner simply never
 * appears — the site keeps working and nobody is misled. That is the reason
 * the failure mode was chosen this way round.
 */

export type LiveStatus = {
  live: boolean
  /** The video to embed, when live. */
  videoId: string | null
  /** Where to watch if the embed is blocked. */
  watchUrl: string | null
}

const NOT_LIVE: LiveStatus = { live: false, videoId: null, watchUrl: null }

const AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36'

async function fetchText(url: string, revalidate: number): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': AGENT, 'accept-language': 'en' },
      next: { revalidate },
    })
    return response.ok ? await response.text() : null
  } catch {
    return null
  }
}

/** The cached channel id, or resolved from the ministry's YouTube link. */
async function channelId(): Promise<string | null> {
  if (prisma) {
    try {
      const row = await prisma.siteSetting.findFirst({ select: { youtubeChannelId: true } })
      if (row?.youtubeChannelId) return row.youtubeChannelId
    } catch {
      // Fall through to resolving it from the link.
    }
  }
  const settings = await getSiteSettings()
  return resolveChannelId(settings.socials.youtube ?? '')
}

export async function checkLive(): Promise<LiveStatus> {
  const id = await channelId()
  if (!id) return NOT_LIVE

  // A minute is short enough that a service starting is noticed quickly, and
  // long enough that a busy Sunday does not hammer YouTube from every visit.
  const livePage = await fetchText(`https://www.youtube.com/channel/${id}/live`, 60)
  if (!livePage) return NOT_LIVE

  const videoId = livePage.match(
    /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{6,20})"/,
  )?.[1]
  if (!videoId) return NOT_LIVE

  /*
   * The deciding request. `isLiveNow` is false on a finished stream and true
   * only while it is actually running, which is the one thing worth trusting
   * on this page.
   */
  const watchPage = await fetchText(`https://www.youtube.com/watch?v=${videoId}`, 60)
  if (!watchPage) return NOT_LIVE

  if (!/"isLiveNow"\s*:\s*true/.test(watchPage)) return NOT_LIVE

  return {
    live: true,
    videoId,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
  }
}
