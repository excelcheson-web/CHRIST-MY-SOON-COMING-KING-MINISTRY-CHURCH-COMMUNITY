import { PostVisibility } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import {
  canPostToScope,
  loadCommunityViewer,
  loadLikedIds,
  loadReactions,
  loadVotes,
  postCardSelect,
  postFeedWhere,
  toFeedPost,
} from '@/lib/community'
import { prisma } from '@/lib/prisma'
import { touchActivity } from '@/lib/profiles'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { channelPaths } from '@/lib/reactions'
import {
  ACCEPTED_LABEL,
  imageSize,
  MAX_UPLOAD_BYTES,
  sniffType,
  storage,
} from '@/lib/storage'
import { postSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/community/posts — the feed the viewer is allowed to see. */
export async function GET(request: Request) {
  if (!prisma) return jsonOk({ posts: [], nextCursor: null })

  const url = new URL(request.url)
  const take = Math.min(Number(url.searchParams.get('take') ?? 20) || 20, 50)
  const cursor = url.searchParams.get('cursor')
  const type = url.searchParams.get('type')

  try {
    const session = await auth()
    // The community section is members-only, so its API is too. Without this
    // the pages would be behind the door while the endpoints behind them
    // answered anybody who typed the URL.
    if (!session?.user) return jsonError('Please sign in to reach the community.', 401)
    const viewer = await loadCommunityViewer(session?.user)

    const channel = (url.searchParams.get('channel') as never) ?? 'FEED'

    const records = await prisma.post.findMany({
      where: {
        AND: [
          postFeedWhere(viewer, channel),
          type && type !== 'all' ? { type: type as never } : {},
        ],
      },
      select: postCardSelect,
      // Pinned first, then newest. Cursor paging keeps working because the
      // cursor is an id and Prisma applies the same ordering either side of it.
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })

    const page = records.slice(0, take)
    const postIds = page.map((row) => row.id)
    const [likedIds, reactions, votedOptionIds] = await Promise.all([
      loadLikedIds(viewer.id, postIds),
      loadReactions(viewer.id, postIds),
      loadVotes(viewer.id, postIds),
    ])

    return jsonOk({
      posts: page.map((record) =>
        toFeedPost(record, { viewer, likedIds, reactions, votedOptionIds }),
      ),
      nextCursor: records.length > take ? (page.at(-1)?.id ?? null) : null,
    })
  } catch (error) {
    return databaseError('community feed', error)
  }
}

/**
 * POST /api/community/posts — write to the feed.
 *
 * Accepts JSON, or multipart when there is a picture. The picture is stored
 * through the same driver chat uses: bytes never land in `public/`, and the
 * type is decided by the magic bytes rather than the browser's claim.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to post.', 401)
  const user = session.user

  // Twenty posts an hour is far above normal use and well below a flood.
  const limit = rateLimit(`post:${user.id}:${clientIp(request.headers)}`, 20, 60 * 60 * 1000)
  if (!limit.ok) {
    return jsonError('That is a lot of posts at once. Please try again shortly.', 429)
  }

  let fields: Record<string, unknown>
  let file: File | null = null

  const contentType = request.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      const candidate = form.get('image')
      file = candidate instanceof File && candidate.size > 0 ? candidate : null
      fields = {
        body: form.get('body'),
        type: form.get('type') || undefined,
        visibility: form.get('visibility') || undefined,
        ministryId: form.get('ministryId') || undefined,
        smallGroupId: form.get('smallGroupId') || undefined,
        videoUrl: form.get('videoUrl') || undefined,
      }
    } else {
      fields = (await request.json()) as Record<string, unknown>
    }
  } catch {
    return jsonError('We could not read that request.', 400)
  }

  const parsed = postSchema.safeParse(fields)
  if (!parsed.success) {
    return jsonError(
      'Please check what you wrote.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()

    const me = await db.user.findUnique({
      where: { id: user.id },
      select: { bannedAt: true, chatBannedAt: true },
    })
    // A chat ban is a community ban — the same person, the same behaviour.
    if (me?.bannedAt || me?.chatBannedAt) {
      return jsonError('You cannot post in the community at the moment.', 403)
    }

    const viewer = await loadCommunityViewer(user)
    const scope = await canPostToScope(parsed.data, viewer)
    if (!scope.ok) return jsonError(scope.error, scope.status)

    let imageKey: string | null = null
    let imageWidth: number | null = null
    let imageHeight: number | null = null

    if (file) {
      if (file.size > MAX_UPLOAD_BYTES) {
        return jsonError(`That picture is too big. The limit is ${ACCEPTED_LABEL}.`, 413)
      }

      const bytes = Buffer.from(await file.arrayBuffer())
      if (bytes.byteLength > MAX_UPLOAD_BYTES) {
        return jsonError(`That picture is too big. The limit is ${ACCEPTED_LABEL}.`, 413)
      }

      const sniffed = sniffType(bytes)
      // A feed post shows the picture inline, so a PDF has nowhere to go here
      // even though the shared sniffer accepts one for chat.
      if (!sniffed || !sniffed.mime.startsWith('image/')) {
        return jsonError('Please choose a picture — PNG, JPEG, GIF or WebP.', 415)
      }

      const stored = await storage.put(bytes, sniffed.ext)
      const size = imageSize(bytes, sniffed.mime)
      imageKey = stored.storageKey
      imageWidth = size?.width ?? null
      imageHeight = size?.height ?? null
    }

    const { ministryId, smallGroupId, praisedId, anonymous, ...rest } = parsed.data

    /*
     * Anonymity is a property of the group, not a checkbox the client can
     * assert. Honoured only inside a group that has it switched on and that
     * this member actually belongs to — otherwise a crafted request would let
     * anyone post unattributably to the public feed.
     */
    let allowAnonymous = false
    if (anonymous && rest.visibility === PostVisibility.SMALL_GROUP && smallGroupId) {
      const group = await db.smallGroup.findUnique({
        where: { id: smallGroupId },
        select: { allowAnonymous: true },
      })
      allowAnonymous = Boolean(group?.allowAnonymous)
    }

    // A shout-out names a real member; anything else is dropped rather than
    // stored as a dangling id.
    let praised: string | null = null
    if (rest.channel === 'ENCOURAGEMENT' && praisedId) {
      const target = await db.user.findUnique({
        where: { id: praisedId },
        select: { id: true, bannedAt: true },
      })
      praised = target && !target.bannedAt ? target.id : null
    }

    const created = await db.post.create({
      data: {
        ...rest,
        authorId: user.id,
        anonymous: allowAnonymous,
        praisedId: praised,
        // Scope ids are only meaningful for their own visibility, and leaving a
        // stale one behind would make a later visibility change leak the post.
        ministryId: rest.visibility === PostVisibility.MINISTRY ? (ministryId ?? null) : null,
        smallGroupId:
          rest.visibility === PostVisibility.SMALL_GROUP ? (smallGroupId ?? null) : null,
        imageKey,
        imageWidth,
        imageHeight,
      },
      select: postCardSelect,
    })

    await touchActivity(user.id)
    revalidatePath('/community')
    revalidatePath(channelPaths[created.channel])
    return jsonOk(toFeedPost(created, { viewer, likedIds: new Set() }), 201)
  } catch (error) {
    return databaseError('community post', error)
  }
}
