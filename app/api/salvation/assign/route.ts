import { FollowUpStatus } from '@prisma/client'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { getApiUser } from '@/lib/auth'
import { assignFollowUp, notifyAssignment } from '@/lib/follow-up'
import { canManageFollowUp, followUpRoles } from '@/lib/permissions'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { assignDecisionSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/salvation/assign
 *
 * With `assignedToId` — hands the decision to a named person.
 * Without it — runs the round-robin, the same one the public contact step uses.
 */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })
  if (!canManageFollowUp(user.role)) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Not allowed.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = assignDecisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the form and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  const { decisionId, assignedToId, notes } = parsed.data

  try {
    const prisma = requirePrisma()

    const decision = await prisma.salvationDecision.findUnique({
      where: { id: decisionId },
      select: { id: true, firstName: true, lastName: true },
    })
    if (!decision) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Decision not found.' }, { status: 404 })
    }

    const personName = [decision.firstName, decision.lastName].filter(Boolean).join(' ') || 'a visitor'

    if (!assignedToId) {
      const result = await assignFollowUp(prisma, decisionId, { assignedById: user.id, notes })

      if (!result.assigned) {
        return NextResponse.json<ApiResult>(
          {
            ok: false,
            error:
              'Nobody is available for follow-up. Add a user with the FOLLOW_UP_TEAM role, or mark an existing one as available.',
          },
          { status: 409 },
        )
      }

      await notifyAssignment({
        assignedToId: result.assignedToId,
        assignedToName: result.assignedToName,
        decisionId,
        personName,
      })

      revalidatePath('/admin/salvation')
      return NextResponse.json<ApiResult<{ assignedToName: string }>>({
        ok: true,
        data: { assignedToName: result.assignedToName },
      })
    }

    const carer = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, name: true, role: true },
    })
    if (!carer || !followUpRoles.includes(carer.role)) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'That person is not on the follow-up team.' },
        { status: 422 },
      )
    }

    await prisma.$transaction([
      prisma.followUp.create({
        data: {
          decisionId,
          assignedToId: carer.id,
          assignedById: user.id,
          notes,
          status: FollowUpStatus.PENDING,
        },
      }),
      prisma.salvationDecision.update({
        where: { id: decisionId },
        data: { assignedToId: carer.id, stepFollowUp: true, followUpStatus: FollowUpStatus.PENDING },
      }),
    ])

    await notifyAssignment({
      assignedToId: carer.id,
      assignedToName: carer.name,
      decisionId,
      personName,
    })

    revalidatePath('/admin/salvation')
    return NextResponse.json<ApiResult<{ assignedToName: string }>>({
      ok: true,
      data: { assignedToName: carer.name },
    })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'No database is connected yet.' },
        { status: 503 },
      )
    }
    console.error('[salvation/assign]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not assign follow-up.' }, { status: 500 })
  }
}
