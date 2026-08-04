import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { getSiteSettings } from '@/lib/site-settings'
import { uniqueSlug } from '@/lib/slug'
import { fetchChannelVideos, looksLikeShort, resolveChannelId } from '@/lib/youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Bringing the ministry's YouTube uploads into the sermon centre.
 *
 * Imported sermons keep their YouTube watch link in `videoUrl`, which the
 * sermon page turns into a `youtube-nocookie` embed — so a visitor watches the
 * message inside the site and never leaves for YouTube's recommendations.
 *
 * The video id is the identity, not the title: a church that renames an upload
 * must not end up with the same message in the list twice.
 */

/** The channel id, resolved from the ministry's YouTube link and then cached. */
async function channelId(): Promise<string | null> {
  const settings = await getSiteSettings()

  if (!prisma) return resolveChannelId(settings.socials.youtube ?? '')

  try {
    const row = await prisma.siteSetting.findFirst({ select: { id: true, youtubeChannelId: true } })
    if (row?.youtubeChannelId) return row.youtubeChannelId

    const resolved = await resolveChannelId(settings.socials.youtube ?? '')
    // Cache it: resolving means scraping the channel page, which should happen
    // when the link changes rather than on every visit to this admin screen.
    if (resolved && row) {
      await prisma.siteSetting
        .update({ where: { id: row.id }, data: { youtubeChannelId: resolved } })
        .catch(() => null)
    }
    return resolved
  } catch {
    return resolveChannelId(settings.socials.youtube ?? '')
  }
}

/** GET /api/sermons/youtube — the channel's recent uploads, and which are in already. */
export async function GET() {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) {
    return jsonError('Only pastors and administrators can import sermons.', 403)
  }

  const id = await channelId()
  if (!id) {
    return jsonError(
      'We could not work out the YouTube channel. Check the YouTube link in Settings — it should be the channel address, like https://youtube.com/@yourchannel.',
      422,
    )
  }

  const videos = await fetchChannelVideos(id)

  // Which are already in, matched on the video id inside the stored URL rather
  // than on the title — a renamed upload is still the same message.
  let importedIds = new Set<string>()
  if (prisma && videos.length > 0) {
    try {
      const existing = await prisma.sermon.findMany({
        where: { OR: videos.map((video) => ({ videoUrl: { contains: video.videoId } })) },
        select: { videoUrl: true },
      })
      importedIds = new Set(
        videos
          .filter((video) => existing.some((row) => row.videoUrl?.includes(video.videoId)))
          .map((video) => video.videoId),
      )
    } catch (error) {
      console.error('[youtube import] could not check existing', error)
    }
  }

  return jsonOk({
    channelId: id,
    videos: videos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      description: video.description.slice(0, 400),
      publishedAt: video.publishedAt.toISOString(),
      url: video.url,
      thumbnail: video.thumbnail,
      isShort: looksLikeShort(video),
      imported: importedIds.has(video.videoId),
    })),
  })
}

/** POST /api/sermons/youtube — import the chosen videos as sermons. */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) {
    return jsonError('Only pastors and administrators can import sermons.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const payload = (body ?? {}) as { videoIds?: unknown; publish?: unknown; speaker?: unknown }

  const videoIds = Array.isArray(payload.videoIds)
    ? payload.videoIds.filter((value): value is string => typeof value === 'string').slice(0, 25)
    : []
  if (videoIds.length === 0) return jsonError('Choose at least one video.', 422)

  const publish = payload.publish === true
  const settings = await getSiteSettings()
  const speaker =
    typeof payload.speaker === 'string' && payload.speaker.trim()
      ? payload.speaker.trim().slice(0, 120)
      : settings.name

  const id = await channelId()
  if (!id) return jsonError('We could not work out the YouTube channel.', 422)

  const videos = await fetchChannelVideos(id)
  const chosen = videos.filter((video) => videoIds.includes(video.videoId))
  if (chosen.length === 0) {
    return jsonError('Those videos are no longer in the channel feed.', 422)
  }

  try {
    const db = requirePrisma()
    const created: string[] = []
    let skipped = 0

    for (const video of chosen) {
      // Re-checked per video rather than once up front: two administrators
      // importing at the same moment would otherwise both pass the check.
      const already = await db.sermon.findFirst({
        where: { videoUrl: { contains: video.videoId } },
        select: { id: true },
      })
      if (already) {
        skipped++
        continue
      }

      const slug = await uniqueSlug(
        video.title,
        async (candidate) =>
          (await db.sermon.count({ where: { slug: candidate } })) > 0,
      )

      const sermon = await db.sermon.create({
        data: {
          title: video.title.slice(0, 200),
          slug,
          description: video.description ? video.description.slice(0, 4000) : null,
          speaker,
          preachedAt: video.publishedAt,
          videoUrl: video.url,
          image: video.thumbnail,
          status: publish ? 'PUBLISHED' : 'DRAFT',
          createdById: session.user.id,
        },
        select: { slug: true },
      })
      created.push(sermon.slug)
    }

    revalidatePath('/sermons')
    revalidatePath('/admin/sermons')
    revalidatePath('/')

    return jsonOk({ created: created.length, skipped, slugs: created })
  } catch (error) {
    return databaseError('youtube import', error)
  }
}
