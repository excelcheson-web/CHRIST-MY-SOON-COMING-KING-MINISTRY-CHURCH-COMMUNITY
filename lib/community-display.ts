import type { PostChannel, PostType, PostVisibility, ReactionType, Role } from '@prisma/client'

/**
 * The shape and wording the community feed renders.
 *
 * Separate from `lib/community.ts` because that module is `server-only` — it
 * holds the visibility rules and touches the database, neither of which belongs
 * in a browser bundle. Everything here is safe on both sides: the Prisma
 * imports are types, so they vanish at compile time.
 */

export type FeedPoll = {
  id: string
  question: string
  multiple: boolean
  closesAt: string | null
  closed: boolean
  options: { id: string; label: string; votes: number; mine: boolean }[]
}

export type FeedPost = {
  id: string
  type: PostType
  channel: PostChannel
  body: string
  videoUrl: string | null
  imageUrl: string | null
  visibility: PostVisibility
  /** The ministry or small group name, when the post is scoped to one. */
  scopeLabel: string | null
  pinned: boolean
  flagged: boolean
  /** Posted without a name, in a group that allows it. */
  anonymous: boolean
  likeCount: number
  commentCount: number
  createdAt: string
  /**
   * Null for an anonymous post the viewer is not entitled to attribute. The
   * server withholds it — it is not merely hidden at render time.
   */
  authorId: string | null
  authorName: string
  authorImage: string | null
  authorRole: Role
  /** Shout-outs name the person being thanked. */
  praisedName: string | null
  praisedId: string | null
  isMine: boolean
  canRemove: boolean
  hasLiked: boolean
  myReaction: ReactionType | null
  reactions: { type: ReactionType; count: number }[]
  poll: FeedPoll | null
}

export type FeedComment = {
  id: string
  body: string
  parentId: string | null
  createdAt: string
  authorName: string
  authorImage: string | null
  authorRole: Role
  isMine: boolean
  canRemove: boolean
}

export const postTypeLabels: Record<PostType, string> = {
  GENERAL: 'Sharing',
  PRAYER: 'Prayer',
  TESTIMONY: 'Testimony',
  QUESTION: 'Question',
  ENCOURAGEMENT: 'Encouragement',
}

export const postTypeEmoji: Record<PostType, string> = {
  GENERAL: '💬',
  PRAYER: '🙏',
  TESTIMONY: '✨',
  QUESTION: '❓',
  ENCOURAGEMENT: '💛',
}

export const visibilityLabels: Record<PostVisibility, string> = {
  PUBLIC: 'Everyone, including visitors',
  MEMBERS: 'Members only',
  MINISTRY: 'My ministry',
  SMALL_GROUP: 'My small group',
}

export const visibilityShort: Record<PostVisibility, string> = {
  PUBLIC: 'Public',
  MEMBERS: 'Members',
  MINISTRY: 'Ministry',
  SMALL_GROUP: 'Group',
}

/** "just now" · "4 min ago" · "2 days ago" · then a plain date. */
export function timeAgo(iso: string, now = Date.now()) {
  const seconds = Math.round((now - new Date(iso).getTime()) / 1000)
  if (seconds < 45) return 'just now'
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  if (seconds < 604800) {
    const days = Math.round(seconds / 86400)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}
