import 'server-only'

import type { PostChannel } from '@prisma/client'

import {
  loadCommunityViewer,
  loadLikedIds,
  loadReactions,
  loadVotes,
  postCardSelect,
  postFeedWhere,
  toFeedPost,
} from '@/lib/community'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'

/**
 * Loads one channel board.
 *
 * Every board — the wall, the verse, the challenge, worship — is the same four
 * queries, so they share this rather than each page repeating them and one of
 * them eventually forgetting the visibility filter.
 */
export async function loadChannel(
  channel: PostChannel,
  user: Session['user'] | null | undefined,
  take = 20,
) {
  const viewer = await loadCommunityViewer(user)

  const records = prisma
    ? await prisma.post
        .findMany({
          where: postFeedWhere(viewer, channel),
          select: postCardSelect,
          orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
          take: take + 1,
        })
        .catch((error) => {
          console.error(`[channel ${channel}]`, error)
          return []
        })
    : []

  const page = records.slice(0, take)
  const postIds = page.map((record) => record.id)

  const [likedIds, reactions, votedOptionIds] = await Promise.all([
    loadLikedIds(viewer.id, postIds),
    loadReactions(viewer.id, postIds),
    loadVotes(viewer.id, postIds),
  ])

  return {
    viewer,
    posts: page.map((record) => toFeedPost(record, { viewer, likedIds, reactions, votedOptionIds })),
    nextCursor: records.length > take ? (page.at(-1)?.id ?? null) : null,
  }
}

/**
 * Members who can be named in a shout-out.
 *
 * Only people who are listed in the directory — being thanked in public puts
 * your name on a board, and somebody who opted out of the directory did not
 * agree to that.
 */
export async function namableMembers(take = 300) {
  if (!prisma) return []
  try {
    return await prisma.user.findMany({
      where: { bannedAt: null, profile: { is: { listed: true } } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take,
    })
  } catch {
    return []
  }
}
