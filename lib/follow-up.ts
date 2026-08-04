import 'server-only'

import { FollowUpStatus, type PrismaClient } from '@prisma/client'

import { followUpRoles } from '@/lib/permissions'

/** Statuses that still need someone's attention — i.e. real workload. */
export const openStatuses: FollowUpStatus[] = [
  FollowUpStatus.PENDING,
  FollowUpStatus.CONTACTED,
  FollowUpStatus.MEETING_SET,
  FollowUpStatus.DISCIPLESHIP_STARTED,
]

export type AssignmentResult =
  | { assigned: true; assignedToId: string; assignedToName: string; followUpId: string }
  | { assigned: false; reason: 'no-team-available' }

/**
 * Picks the next follow-up carer.
 *
 * Not a naive rotation: it chooses whoever currently has the fewest *open*
 * follow-ups, breaking ties in favour of whoever was assigned least recently.
 * That keeps the load even when volunteers go unavailable and come back, which
 * a simple counter cannot do.
 */
export async function assignFollowUp(
  db: PrismaClient,
  decisionId: string,
  options: { assignedById?: string; notes?: string } = {},
): Promise<AssignmentResult> {
  const candidates = await db.user.findMany({
    where: { role: { in: followUpRoles }, availableForFollowUp: true },
    select: { id: true, name: true },
  })

  if (candidates.length === 0) return { assigned: false, reason: 'no-team-available' }

  const candidateIds = candidates.map((candidate) => candidate.id)

  const [openLoads, lastAssignments] = await Promise.all([
    db.followUp.groupBy({
      by: ['assignedToId'],
      where: { assignedToId: { in: candidateIds }, status: { in: openStatuses } },
      _count: { _all: true },
    }),
    db.followUp.groupBy({
      by: ['assignedToId'],
      where: { assignedToId: { in: candidateIds } },
      _max: { createdAt: true },
    }),
  ])

  const loadById = new Map(openLoads.map((row) => [row.assignedToId, row._count._all]))
  const lastById = new Map(
    lastAssignments.map((row) => [row.assignedToId, row._max.createdAt?.getTime() ?? 0]),
  )

  const chosen = [...candidates].sort((a, b) => {
    const loadDelta = (loadById.get(a.id) ?? 0) - (loadById.get(b.id) ?? 0)
    if (loadDelta !== 0) return loadDelta

    const lastDelta = (lastById.get(a.id) ?? 0) - (lastById.get(b.id) ?? 0)
    if (lastDelta !== 0) return lastDelta

    return a.id.localeCompare(b.id) // stable final tie-break
  })[0]!

  const [followUp] = await db.$transaction([
    db.followUp.create({
      data: {
        decisionId,
        assignedToId: chosen.id,
        assignedById: options.assignedById,
        notes: options.notes,
        status: FollowUpStatus.PENDING,
      },
      select: { id: true },
    }),
    db.salvationDecision.update({
      where: { id: decisionId },
      data: {
        assignedToId: chosen.id,
        stepFollowUp: true,
        followUpStatus: FollowUpStatus.PENDING,
      },
    }),
  ])

  return {
    assigned: true,
    assignedToId: chosen.id,
    assignedToName: chosen.name,
    followUpId: followUp.id,
  }
}

/**
 * Notification hook.
 *
 * TODO(phase 2C): wire to Resend (email) and Twilio (SMS). Deliberately left as
 * a single seam so the transport can be swapped without touching the assignment
 * logic above. It logs for now — silence here must never fail a decision.
 */
export async function notifyAssignment(input: {
  assignedToId: string
  assignedToName: string
  decisionId: string
  personName: string
}) {
  console.info(
    `[follow-up] ${input.assignedToName} (${input.assignedToId}) assigned to ${input.personName} — decision ${input.decisionId}`,
  )
}
