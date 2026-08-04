import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { readDecisionId } from '@/lib/salvation-session'
import { salvationStepSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UpdateResult = { tracked: boolean }

/**
 * Marks a funnel step complete for *this browser's* decision record — the id
 * comes from the httpOnly cookie, never from the request body, so one visitor
 * cannot touch another's record.
 *
 * Like /start, this is fire-and-forget: a failure here must never stop someone
 * reaching the prayer.
 */
export async function POST(request: Request) {
  const decisionId = readDecisionId()
  if (!prisma || !decisionId) {
    return NextResponse.json<ApiResult<UpdateResult>>({ ok: true, data: { tracked: false } })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const parsed = salvationStepSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Unknown step.' }, { status: 422 })
  }

  const data =
    parsed.data.step === 'gospel'
      ? { stepGospel: true }
      : { stepGospel: true, stepPrayer: true } // reaching the prayer implies the gospel

  try {
    await prisma.salvationDecision.update({ where: { id: decisionId }, data })
    return NextResponse.json<ApiResult<UpdateResult>>({ ok: true, data: { tracked: true } })
  } catch (error) {
    console.error('[salvation/update]', error)
    return NextResponse.json<ApiResult<UpdateResult>>({ ok: true, data: { tracked: false } })
  }
}
