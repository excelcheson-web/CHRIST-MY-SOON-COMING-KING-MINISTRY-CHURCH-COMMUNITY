import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * Badges, computed rather than stored.
 *
 * There is no `MemberBadge` table on purpose. Awarding rows means a background
 * job, a backfill for everyone who qualified before the feature existed, and a
 * silent drift the first time a counter is corrected. Deriving them from the
 * numbers that already exist means a badge is always true by construction.
 *
 * They are also deliberately quiet: no leaderboard, no points, no ranking of
 * members against each other. A church is not a game. These say "thank you for
 * showing up", and that is all they are allowed to say.
 */

export type Badge = {
  id: string
  label: string
  hint: string
  emoji: string
  /** Whether this member has it. */
  earned: boolean
  /** Progress towards it, for the ones that are close. */
  progress?: { current: number; target: number }
}

type Counts = {
  prayers: number
  posts: number
  encouragements: number
  helpOffers: number
  discipleshipDone: number
  initiativesCompleted: number
  testimonies: number
  yearsHere: number
}

const definitions: {
  id: string
  label: string
  hint: string
  emoji: string
  target: number
  of: keyof Counts
}[] = [
  { id: 'welcome', label: 'Welcome home', hint: 'Joined the church family', emoji: '🏡', target: 0, of: 'yearsHere' },
  { id: 'prayer-warrior', label: 'Prayer warrior', hint: 'Prayed for 100 requests', emoji: '🙏', target: 100, of: 'prayers' },
  { id: 'intercessor', label: 'Faithful intercessor', hint: 'Prayed for 25 requests', emoji: '🕯️', target: 25, of: 'prayers' },
  { id: 'encourager', label: 'Encourager', hint: 'Sent 10 shout-outs', emoji: '💛', target: 10, of: 'encouragements' },
  { id: 'servant-heart', label: 'Servant heart', hint: 'Offered help 5 times', emoji: '🤝', target: 5, of: 'helpOffers' },
  { id: 'disciple', label: 'Disciple', hint: 'Finished a discipleship course', emoji: '📚', target: 1, of: 'discipleshipDone' },
  { id: 'steadfast', label: 'Steadfast', hint: 'Completed a fast or reading plan', emoji: '🔥', target: 1, of: 'initiativesCompleted' },
  { id: 'storyteller', label: 'Storyteller', hint: 'Shared a testimony', emoji: '✨', target: 1, of: 'testimonies' },
  { id: 'family', label: 'Part of the furniture', hint: 'One year with us', emoji: '🎂', target: 1, of: 'yearsHere' },
]

export async function loadBadges(userId: string): Promise<Badge[]> {
  if (!prisma) return []

  try {
    const [
      prayers,
      posts,
      encouragements,
      helpOffers,
      discipleshipDone,
      initiativesCompleted,
      testimonies,
      user,
    ] = await Promise.all([
      prisma.prayerLog.count({ where: { userId } }),
      prisma.post.count({ where: { authorId: userId, deletedAt: null } }),
      prisma.post.count({
        where: { authorId: userId, channel: 'ENCOURAGEMENT', deletedAt: null },
      }),
      prisma.helpPost.count({ where: { authorId: userId, kind: 'OFFER' } }),
      prisma.discipleshipProgress.count({ where: { userId, completedAt: { not: null } } }),
      prisma.initiativeMember.count({ where: { userId, completedAt: { not: null } } }),
      prisma.testimony.count({ where: { authorId: userId, status: 'APPROVED' } }),
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    ])

    const yearsHere = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (365 * 86_400_000))
      : 0

    const counts: Counts = {
      prayers,
      posts,
      encouragements,
      helpOffers,
      discipleshipDone,
      initiativesCompleted,
      testimonies,
      yearsHere,
    }

    return definitions.map((definition) => {
      const current = counts[definition.of]
      const earned = current >= definition.target
      return {
        id: definition.id,
        label: definition.label,
        hint: definition.hint,
        emoji: definition.emoji,
        earned,
        // Progress is only interesting for the ones still being worked towards.
        progress: earned || definition.target <= 1 ? undefined : { current, target: definition.target },
      }
    })
  } catch (error) {
    console.error('[badges]', error)
    return []
  }
}
