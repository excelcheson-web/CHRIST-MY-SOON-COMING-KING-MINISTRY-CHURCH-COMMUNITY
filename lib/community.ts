import 'server-only'

import { Prisma, PostVisibility, type PostChannel, type ReactionType, type Role } from '@prisma/client'

import type { FeedPost } from '@/lib/community-display'
import { canModerateCommunityFeed } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'

/*
 * Labels, the `FeedPost` shape and `timeAgo` live in `lib/community-display.ts`
 * so client components can import them without pulling this `server-only`
 * module in. Re-exported here so server code has a single import.
 */
export * from '@/lib/community-display'

/**
 * Who can see which community posts.
 *
 * Written as one function for the same reason `prayerWallWhere` is: a post
 * scoped to a small group was written on the understanding that eight people
 * would read it. Every read path in the feature builds its filter from
 * `postFeedWhere` — nothing assembles its own `where`, so there is exactly one
 * place to get this wrong and exactly one place to check.
 */

export type CommunityViewer = {
  id?: string
  role?: Role
  name?: string
  /** Ministries the viewer belongs to (or leads). */
  ministryIds: string[]
  /** Small groups the viewer belongs to (or leads). */
  smallGroupIds: string[]
  /** People the viewer has blocked — their posts are hidden. */
  blockedIds: string[]
}

export const guestViewer: CommunityViewer = {
  ministryIds: [],
  smallGroupIds: [],
  blockedIds: [],
}

/**
 * Remove any post or comment, pin announcements, action reports.
 *
 * Defined in `lib/permissions.ts` alongside every other role rule and aliased
 * here, so the feature reads from one import and the answer only exists once.
 */
export const canModerateCommunity = canModerateCommunityFeed

/**
 * Resolves everything the filter below needs, in one round trip's worth of
 * parallel queries. Called once per request, never per post.
 */
export async function loadCommunityViewer(
  user: Session['user'] | null | undefined,
): Promise<CommunityViewer> {
  if (!user?.id) return guestViewer

  const base: CommunityViewer = {
    id: user.id,
    role: user.role,
    name: user.name ?? undefined,
    ministryIds: [],
    smallGroupIds: [],
    blockedIds: [],
  }
  if (!prisma) return base

  try {
    const [ministries, groups, blocks] = await Promise.all([
      prisma.ministryMember.findMany({ where: { userId: user.id }, select: { ministryId: true } }),
      prisma.smallGroupMember.findMany({ where: { userId: user.id }, select: { groupId: true } }),
      prisma.userBlock.findMany({ where: { blockerId: user.id }, select: { blockedId: true } }),
    ])

    return {
      ...base,
      ministryIds: ministries.map((row) => row.ministryId),
      smallGroupIds: groups.map((row) => row.groupId),
      blockedIds: blocks.map((row) => row.blockedId),
    }
  } catch {
    // A membership lookup failing must never widen visibility, so the empty
    // lists are the safe answer as well as the convenient one.
    return base
  }
}

/**
 * The feed filter.
 *
 * Note the deliberate asymmetry: moderators skip the *visibility* rules so they
 * can do their job, but they still do not see soft-deleted posts in the normal
 * feed — those surface only in the moderation queue, which asks for them
 * explicitly.
 */
export function postFeedWhere(
  viewer: CommunityViewer,
  channel: PostChannel = 'FEED',
): Prisma.PostWhereInput {
  // Channels are boards, not tabs: a shout-out does not belong in the main
  // feed, and a verse reflection does not belong on the encouragement wall.
  const live: Prisma.PostWhereInput = { deletedAt: null, channel }

  // Blocking is the viewer's own choice and applies to moderators too — if you
  // blocked someone, you asked not to read them.
  const notBlocked: Prisma.PostWhereInput =
    viewer.blockedIds.length > 0 ? { authorId: { notIn: viewer.blockedIds } } : {}

  if (canModerateCommunity(viewer.role)) return { AND: [live, notBlocked] }

  if (!viewer.id) {
    return { AND: [live, { visibility: PostVisibility.PUBLIC }] }
  }

  const scopes: Prisma.PostWhereInput[] = [
    { visibility: PostVisibility.PUBLIC },
    { visibility: PostVisibility.MEMBERS },
  ]

  if (viewer.ministryIds.length > 0) {
    scopes.push({
      visibility: PostVisibility.MINISTRY,
      ministryId: { in: viewer.ministryIds },
    })
  }
  if (viewer.smallGroupIds.length > 0) {
    scopes.push({
      visibility: PostVisibility.SMALL_GROUP,
      smallGroupId: { in: viewer.smallGroupIds },
    })
  }

  return {
    AND: [
      live,
      notBlocked,
      // Your own posts are always yours to read, whatever scope you chose.
      { OR: [{ authorId: viewer.id }, ...scopes] },
    ],
  }
}

/** Single-post check, mirroring the rules above. Used before a detail view. */
export function canViewPost(
  post: {
    authorId: string
    visibility: PostVisibility
    ministryId: string | null
    smallGroupId: string | null
    deletedAt: Date | null
  },
  viewer: CommunityViewer,
) {
  if (post.deletedAt) return canModerateCommunity(viewer.role)
  if (viewer.id && post.authorId === viewer.id) return true
  if (viewer.blockedIds.includes(post.authorId)) return false
  if (canModerateCommunity(viewer.role)) return true

  switch (post.visibility) {
    case PostVisibility.PUBLIC:
      return true
    case PostVisibility.MEMBERS:
      return Boolean(viewer.id)
    case PostVisibility.MINISTRY:
      return Boolean(post.ministryId && viewer.ministryIds.includes(post.ministryId))
    case PostVisibility.SMALL_GROUP:
      return Boolean(post.smallGroupId && viewer.smallGroupIds.includes(post.smallGroupId))
    default:
      return false
  }
}

/** May this person edit or remove the post? Authors and moderators only. */
export function canEditPost(post: { authorId: string }, viewer: CommunityViewer) {
  return viewer.id === post.authorId || canModerateCommunity(viewer.role)
}

export type ScopeCheck = { ok: true } | { ok: false; error: string; status: 403 | 422 }

/**
 * Checks the viewer is actually allowed to post into the scope they picked.
 *
 * Without this, the visibility field would be a suggestion: anyone could POST
 * `{ visibility: 'SMALL_GROUP', smallGroupId: '<any id>' }` and drop a message
 * into a group they have never been part of.
 *
 * Async because of the leaders' bypass. A member's own membership list proves
 * the group exists — you cannot be a member of a row that is not there — but a
 * leader may post into any group, so their id has to be looked up. Skipping
 * that turned a typo'd id into a foreign-key crash rather than a field error.
 */
export async function canPostToScope(
  input: { visibility: PostVisibility; ministryId?: string | null; smallGroupId?: string | null },
  viewer: CommunityViewer,
): Promise<ScopeCheck> {
  if (!viewer.id) return { ok: false, error: 'Please sign in to post.', status: 403 }

  const isModerator = canModerateCommunity(viewer.role)

  switch (input.visibility) {
    case PostVisibility.PUBLIC:
    case PostVisibility.MEMBERS:
      return { ok: true }

    case PostVisibility.MINISTRY: {
      const id = input.ministryId
      if (!id) return { ok: false, error: 'Please choose a ministry.', status: 422 }
      if (viewer.ministryIds.includes(id)) return { ok: true }
      if (!isModerator) {
        return { ok: false, error: 'You are not part of that ministry yet.', status: 403 }
      }
      return (await exists('ministry', id))
        ? { ok: true }
        : { ok: false, error: 'We could not find that ministry.', status: 422 }
    }

    case PostVisibility.SMALL_GROUP: {
      const id = input.smallGroupId
      if (!id) return { ok: false, error: 'Please choose a small group.', status: 422 }
      if (viewer.smallGroupIds.includes(id)) return { ok: true }
      if (!isModerator) {
        return { ok: false, error: 'You are not part of that group yet.', status: 403 }
      }
      return (await exists('smallGroup', id))
        ? { ok: true }
        : { ok: false, error: 'We could not find that group.', status: 422 }
    }

    default:
      return { ok: false, error: 'Please choose who can see this.', status: 422 }
  }
}

async function exists(model: 'ministry' | 'smallGroup', id: string) {
  if (!prisma) return false
  try {
    const row =
      model === 'ministry'
        ? await prisma.ministry.findUnique({ where: { id }, select: { id: true } })
        : await prisma.smallGroup.findUnique({ where: { id }, select: { id: true } })
    return Boolean(row)
  } catch {
    return false
  }
}

export const postCardSelect = {
  id: true,
  type: true,
  channel: true,
  body: true,
  videoUrl: true,
  imageKey: true,
  visibility: true,
  pinned: true,
  flagged: true,
  anonymous: true,
  likeCount: true,
  commentCount: true,
  createdAt: true,
  authorId: true,
  author: { select: { id: true, name: true, image: true, role: true } },
  praised: { select: { id: true, name: true } },
  ministry: { select: { name: true, slug: true } },
  smallGroup: { select: { name: true, slug: true, kind: true } },
  poll: {
    select: {
      id: true,
      question: true,
      multiple: true,
      closesAt: true,
      options: {
        orderBy: { order: 'asc' },
        select: { id: true, label: true, _count: { select: { votes: true } } },
      },
    },
  },
} satisfies Prisma.PostSelect

export type PostRecord = Prisma.PostGetPayload<{ select: typeof postCardSelect }>

/** What the viewer has reacted with, and the tally, keyed by post id. */
export type ReactionState = {
  mine: Map<string, ReactionType>
  tally: Map<string, { type: ReactionType; count: number }[]>
}

export const emptyReactions: ReactionState = { mine: new Map(), tally: new Map() }

export function toFeedPost(
  record: PostRecord,
  options: {
    viewer: CommunityViewer
    likedIds?: Set<string>
    reactions?: ReactionState
    votedOptionIds?: Set<string>
  },
): FeedPost {
  const { viewer } = options
  const reactions = options.reactions ?? emptyReactions

  /*
   * Anonymity is applied here, not in the component — the author's name and
   * avatar never reach the browser for an anonymous post, so no future template
   * can render them by accident. The group's leader is the one exception, and
   * they see a marked "posted anonymously" label rather than a silent reveal.
   */
  const leaderSees =
    record.anonymous && Boolean(viewer.id) && canModerateCommunityFeed(viewer.role)
  const hideAuthor = record.anonymous && !leaderSees && viewer.id !== record.authorId

  return {
    id: record.id,
    type: record.type,
    channel: record.channel,
    body: record.body,
    videoUrl: record.videoUrl,
    // Images go through the authenticated route, never a public path — the
    // same rule chat attachments follow.
    imageUrl: record.imageKey ? `/api/community/images/${record.id}` : null,
    visibility: record.visibility,
    scopeLabel: record.ministry?.name ?? record.smallGroup?.name ?? null,
    pinned: record.pinned,
    flagged: record.flagged,
    anonymous: record.anonymous,
    likeCount: record.likeCount,
    commentCount: record.commentCount,
    createdAt: record.createdAt.toISOString(),
    authorId: hideAuthor ? null : record.authorId,
    authorName: hideAuthor ? 'A member' : record.author.name,
    authorImage: hideAuthor ? null : record.author.image,
    authorRole: record.author.role,
    praisedName: record.praised?.name ?? null,
    praisedId: record.praised?.id ?? null,
    isMine: viewer.id === record.authorId,
    canRemove: canEditPost(record, viewer),
    hasLiked: options.likedIds?.has(record.id) ?? false,
    myReaction: reactions.mine.get(record.id) ?? null,
    reactions: reactions.tally.get(record.id) ?? [],
    poll: record.poll
      ? {
          id: record.poll.id,
          question: record.poll.question,
          multiple: record.poll.multiple,
          closesAt: record.poll.closesAt?.toISOString() ?? null,
          closed: Boolean(record.poll.closesAt && record.poll.closesAt < new Date()),
          options: record.poll.options.map((option) => ({
            id: option.id,
            label: option.label,
            votes: option._count.votes,
            mine: options.votedOptionIds?.has(option.id) ?? false,
          })),
        }
      : null,
  }
}

/**
 * Everyone's reactions to these posts, plus the viewer's own, in two queries.
 *
 * A `groupBy` for the tallies rather than loading every reaction row: a post
 * with four hundred reactions should cost five numbers, not four hundred rows.
 */
export async function loadReactions(
  userId: string | undefined,
  postIds: string[],
): Promise<ReactionState> {
  if (!prisma || postIds.length === 0) return emptyReactions

  try {
    const [grouped, mine] = await Promise.all([
      prisma.postReaction.groupBy({
        by: ['postId', 'type'],
        where: { postId: { in: postIds } },
        _count: { _all: true },
      }),
      userId
        ? prisma.postReaction.findMany({
            where: { userId, postId: { in: postIds } },
            select: { postId: true, type: true },
          })
        : Promise.resolve([]),
    ])

    const tally = new Map<string, { type: ReactionType; count: number }[]>()
    for (const row of grouped) {
      const list = tally.get(row.postId) ?? []
      list.push({ type: row.type, count: row._count._all ?? 0 })
      tally.set(row.postId, list)
    }

    return {
      tally,
      mine: new Map(mine.map((row) => [row.postId, row.type])),
    }
  } catch {
    return emptyReactions
  }
}

/** Which poll options the viewer has already chosen. */
export async function loadVotes(userId: string | undefined, postIds: string[]) {
  if (!prisma || !userId || postIds.length === 0) return new Set<string>()

  try {
    const votes = await prisma.pollVote.findMany({
      where: { userId, poll: { postId: { in: postIds } } },
      select: { optionId: true },
    })
    return new Set(votes.map((vote) => vote.optionId))
  } catch {
    return new Set<string>()
  }
}

/** Which of these posts has the viewer already liked? Guests have liked nothing. */
export async function loadLikedIds(userId: string | undefined, postIds: string[]) {
  if (!prisma || !userId || postIds.length === 0) return new Set<string>()

  try {
    const likes = await prisma.postLike.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    })
    return new Set(likes.map((like) => like.postId))
  } catch {
    return new Set<string>()
  }
}

