import type { PostChannel, ReactionType } from '@prisma/client'

/**
 * Reactions and channels — the display half, safe on both server and client.
 *
 * Prisma imports here are types only, so they vanish at compile time and this
 * module can be pulled into a browser bundle.
 */

export const reactionOrder: ReactionType[] = [
  'PRAYING',
  'LOVE',
  'ENCOURAGED',
  'AMEN',
  'REJOICING',
]

export const reactionEmoji: Record<ReactionType, string> = {
  PRAYING: '🙏',
  LOVE: '❤️',
  ENCOURAGED: '🔥',
  AMEN: '🤝',
  REJOICING: '🎉',
}

/**
 * Labels are verbs, not nouns — the button says what you are doing.
 * They double as the accessible name, so they have to stand alone.
 */
export const reactionLabels: Record<ReactionType, string> = {
  PRAYING: 'Praying for this',
  LOVE: 'Love this',
  ENCOURAGED: 'Encouraged by this',
  AMEN: 'Amen to this',
  REJOICING: 'Rejoicing with you',
}

export type ReactionTally = { type: ReactionType; count: number }

/** Only the reactions somebody actually gave, biggest first. */
export function sortTally(tally: ReactionTally[]) {
  return [...tally]
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || reactionOrder.indexOf(a.type) - reactionOrder.indexOf(b.type))
}

export function totalReactions(tally: ReactionTally[]) {
  return tally.reduce((sum, row) => sum + row.count, 0)
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export const channelLabels: Record<PostChannel, string> = {
  FEED: 'Community feed',
  ENCOURAGEMENT: 'Encouragement wall',
  VERSE: 'Verse of the day',
  CHALLENGE: 'This week’s challenge',
  WORSHIP: 'Worship we love',
}

export const channelEmoji: Record<PostChannel, string> = {
  FEED: '💬',
  ENCOURAGEMENT: '💛',
  VERSE: '📖',
  CHALLENGE: '🎯',
  WORSHIP: '🎵',
}

export const channelHints: Record<PostChannel, string> = {
  FEED: 'Everything the church family is sharing.',
  ENCOURAGEMENT: 'Short, public thank-yous. Name somebody and tell them why.',
  VERSE: 'What today’s verse said to you.',
  CHALLENGE: 'How you got on with this week’s challenge.',
  WORSHIP: 'A song that carried you this week, and why.',
}

export const channelPaths: Record<PostChannel, string> = {
  FEED: '/community',
  ENCOURAGEMENT: '/community/encouragement',
  VERSE: '/community/verse',
  CHALLENGE: '/community/challenge',
  WORSHIP: '/community/worship',
}
