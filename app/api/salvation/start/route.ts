import { NextResponse } from 'next/server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { readDecisionId, writeDecisionId } from '@/lib/salvation-session'
import { salvationStartSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type StartResult = { tracked: boolean }

/**
 * Called when someone taps "I want to follow Jesus".
 *
 * Never blocks the journey. If there is no database, or anything else goes
 * wrong, it answers `tracked: false` and the person still reads every word and
 * prays — we simply lose the analytics, which is the right thing to lose.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const limit = rateLimit(`salvation-start:${clientIp(request.headers)}`, 20, 60 * 60 * 1000)
  if (!limit.ok) {
    return NextResponse.json<ApiResult<StartResult>>({ ok: true, data: { tracked: false } })
  }

  if (!prisma) return NextResponse.json<ApiResult<StartResult>>({ ok: true, data: { tracked: false } })

  let decision: 'SALVATION' | 'REDEDICATION' | 'BAPTISM' | 'MEMBERSHIP' | 'PRAYER_REQUEST' =
    'SALVATION'
  try {
    const parsed = salvationStartSchema.safeParse(await request.json())
    if (parsed.success) decision = parsed.data.decision
  } catch {
    // Empty or malformed body is fine — default to SALVATION.
  }

  try {
    // Someone who restarts within the cookie window keeps their existing record
    // instead of creating a duplicate.
    const existingId = readDecisionId()
    if (existingId) {
      const existing = await prisma.salvationDecision.findUnique({
        where: { id: existingId },
        select: { id: true, completed: true },
      })
      if (existing && !existing.completed) {
        return NextResponse.json<ApiResult<StartResult>>({ ok: true, data: { tracked: true } })
      }
    }

    const session = await auth()

    const created = await prisma.salvationDecision.create({
      data: {
        decision,
        userId: session?.user?.id,
        firstName: session?.user?.name?.split(' ')[0],
        lastName: session?.user?.name?.split(' ').slice(1).join(' ') || undefined,
        email: session?.user?.email ?? undefined,
      },
      select: { id: true },
    })

    writeDecisionId(created.id)
    return NextResponse.json<ApiResult<StartResult>>({ ok: true, data: { tracked: true } })
  } catch (error) {
    console.error('[salvation/start]', error)
    return NextResponse.json<ApiResult<StartResult>>({ ok: true, data: { tracked: false } })
  }
}
