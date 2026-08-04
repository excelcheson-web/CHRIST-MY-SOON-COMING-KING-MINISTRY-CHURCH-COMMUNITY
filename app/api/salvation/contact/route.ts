import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { assignFollowUp, notifyAssignment } from '@/lib/follow-up'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { readDecisionId, writeDecisionId } from '@/lib/salvation-session'
import { salvationContactSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ContactResult = {
  /** True when a real carer was assigned; false when nobody is on the rota yet. */
  assigned: boolean
  assignedToName: string | null
}

/**
 * Step 3 — the person gives us their details, and the ministry takes over.
 *
 * Unlike /start and /update, this one *cannot* fail quietly. Someone has just
 * asked to be contacted; if we cannot record that, they must be told plainly
 * rather than shown a thank-you page that means nothing.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const limit = rateLimit(`salvation-contact:${clientIp(request.headers)}`, 10, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'We could not read that request. Please try again.' },
      { status: 400 },
    )
  }

  const parsed = salvationContactSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the highlighted fields and try again.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  const { firstName, lastName, email, phone, decision, notes } = parsed.data

  try {
    const prisma = requirePrisma()
    const session = await auth()
    const existingId = readDecisionId()

    const data = {
      firstName,
      lastName,
      email,
      phone,
      decision,
      notes,
      stepGospel: true,
      stepPrayer: true,
      stepContact: true,
      userId: session?.user?.id,
    }

    // Update this browser's record if it still exists, otherwise start a fresh
    // one — someone may arrive here with an expired or cleared cookie.
    let decisionId: string | null = null

    if (existingId) {
      const updated = await prisma.salvationDecision
        .update({ where: { id: existingId }, data, select: { id: true } })
        .catch(() => null)
      decisionId = updated?.id ?? null
    }

    if (!decisionId) {
      const created = await prisma.salvationDecision.create({ data, select: { id: true } })
      decisionId = created.id
      writeDecisionId(created.id)
    }

    const assignment = await assignFollowUp(prisma, decisionId)

    if (assignment.assigned) {
      await notifyAssignment({
        assignedToId: assignment.assignedToId,
        assignedToName: assignment.assignedToName,
        decisionId,
        personName: `${firstName} ${lastName}`,
      })
    }

    return NextResponse.json<ApiResult<ContactResult>>(
      {
        ok: true,
        data: {
          assigned: assignment.assigned,
          assignedToName: assignment.assigned ? assignment.assignedToName : null,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      console.error('[salvation/contact]', error.message)
      return NextResponse.json<ApiResult>(
        {
          ok: false,
          error:
            'We cannot save your details online just yet. Please use the contact details in the footer — we would love to hear from you.',
        },
        { status: 503 },
      )
    }

    console.error('[salvation/contact] unexpected error:', error)
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Something went wrong on our side. Please try again.' },
      { status: 500 },
    )
  }
}
