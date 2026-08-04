import { Role } from '@prisma/client'

/**
 * One place that answers "who is allowed to do what".
 *
 * Middleware uses `canAccessAdminArea` as a coarse gate; each admin page then
 * narrows with the specific check it needs, so a follow-up volunteer can reach
 * the decisions board without also reaching the curriculum editor.
 */

export const roleLabels: Record<Role, string> = {
  MEMBER: 'Member',
  FOLLOW_UP_TEAM: 'Follow-up team',
  PRAYER_TEAM: 'Prayer team',
  LEADER: 'Leader',
  PASTOR: 'Pastor',
  ADMIN: 'Administrator',
}

/** Create, edit or delete courses, weeks, lessons and page content. */
export function canManageContent(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.PASTOR
}

/** See salvation decisions, assign them, and record follow-up notes. */
export function canManageFollowUp(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.PASTOR || role === Role.FOLLOW_UP_TEAM
}

/** Be assigned as someone's discipleship mentor. */
export function canMentor(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.PASTOR || role === Role.LEADER
}

/**
 * See PRIVATE prayer requests, log team prayers, and flag for pastoral care.
 *
 * This is the most sensitive permission in the app: PRIVATE requests are the
 * ones people only felt safe writing because a small, named group would read
 * them. Nothing widens this set implicitly.
 */
export function canSeePrivatePrayers(role: Role | undefined) {
  return role === Role.PRAYER_TEAM || role === Role.PASTOR || role === Role.ADMIN
}

/** Answer, flag, edit or remove any prayer request; manage prayer groups. */
export function canModeratePrayer(role: Role | undefined) {
  return canSeePrivatePrayers(role)
}

/** Approve or reject submitted testimonies before they go public. */
export function canApproveTestimony(role: Role | undefined) {
  return role === Role.PASTOR || role === Role.ADMIN || role === Role.PRAYER_TEAM
}

/** Create and edit events, see registrant lists, and run check-in. */
export function canManageEvents(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.PASTOR || role === Role.LEADER
}

/** Remove any community post or comment, pin announcements, action reports. */
export function canModerateCommunityFeed(role: Role | undefined) {
  return role === Role.ADMIN || role === Role.PASTOR || role === Role.LEADER
}

/**
 * Coarse gate for anything under /admin.
 *
 * `middleware.ts` keeps a hand-written copy of the resulting role list — it
 * runs in the edge runtime and cannot import Prisma's `Role`. Change one,
 * change the other.
 */
export function canAccessAdminArea(role: Role | undefined) {
  return (
    canManageContent(role) ||
    canManageFollowUp(role) ||
    canModeratePrayer(role) ||
    canManageEvents(role) ||
    canModerateCommunityFeed(role)
  )
}

/** Roles eligible for the follow-up round-robin, best first. */
export const followUpRoles: Role[] = [Role.FOLLOW_UP_TEAM, Role.PASTOR, Role.ADMIN]

/** Roles that make up the intercessor rota. */
export const prayerTeamRoles: Role[] = [Role.PRAYER_TEAM, Role.PASTOR, Role.ADMIN]

/** Every role that grants some kind of admin-area access. */
export const staffRoles: Role[] = [
  Role.FOLLOW_UP_TEAM,
  Role.PRAYER_TEAM,
  Role.PASTOR,
  Role.ADMIN,
]
