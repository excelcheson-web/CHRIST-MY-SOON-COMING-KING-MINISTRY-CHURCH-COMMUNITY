import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { canManageFollowUp } from '@/lib/permissions'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { followUpStatuses, updateDecisionSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

/**
 * GET /api/salvation/decisions — the follow-up board.
 *
 * Query: ?status=PENDING&mine=1&page=1&search=grace
 *
 * FOLLOW_UP_TEAM members see only the decisions assigned to them; pastors and
 * administrators see everything. That split is enforced here rather than in the
 * UI, so the endpoint is safe on its own.
 */
export async function GET(request: Request) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })
  if (!canManageFollowUp(user.role)) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Not allowed.' }, { status: 403 })
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')?.trim()
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1') || 1)
  const onlyMine =
    url.searchParams.get('mine') === '1' || user.role === Role.FOLLOW_UP_TEAM

  try {
    const prisma = requirePrisma()

    const where = {
      ...(onlyMine ? { assignedToId: user.id } : {}),
      ...(status && followUpStatuses.includes(status as (typeof followUpStatuses)[number])
        ? { followUpStatus: status as (typeof followUpStatuses)[number] }
        : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' as const } },
              { lastName: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    }

    const [total, decisions] = await Promise.all([
      prisma.salvationDecision.count({ where }),
      prisma.salvationDecision.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          assignedTo: { select: { id: true, name: true, email: true } },
          followUps: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ])

    return NextResponse.json<ApiResult<{ decisions: typeof decisions; total: number; page: number; pageSize: number }>>(
      { ok: true, data: { decisions, total, page, pageSize: PAGE_SIZE } },
    )
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'No database is connected yet.' },
        { status: 503 },
      )
    }
    console.error('[salvation/decisions]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not load decisions.' }, { status: 500 })
  }
}

/**
 * PATCH /api/salvation/decisions — record follow-up progress.
 *
 * A FOLLOW_UP_TEAM member may only update decisions assigned to them; pastors
 * and administrators may update any. The latest FollowUp row is kept in step
 * with the decision so the care trail stays honest.
 */
export async function PATCH(request: Request) {
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

  const parsed = updateDecisionSchema.safeParse(body)
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

  const { decisionId, followUpStatus, notes, nextContact, completed, discipleshipStarted } = parsed.data

  try {
    const prisma = requirePrisma()

    const decision = await prisma.salvationDecision.findUnique({
      where: { id: decisionId },
      select: { id: true, assignedToId: true },
    })
    if (!decision) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Decision not found.' }, { status: 404 })
    }

    if (user.role === Role.FOLLOW_UP_TEAM && decision.assignedToId !== user.id) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'That decision is assigned to someone else.' },
        { status: 403 },
      )
    }

    await prisma.salvationDecision.update({
      where: { id: decisionId },
      data: {
        ...(followUpStatus ? { followUpStatus } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(completed !== undefined ? { completed } : {}),
        ...(discipleshipStarted !== undefined ? { discipleshipStarted } : {}),
      },
    })

    // Mirror onto the most recent care record, if there is one.
    const latest = await prisma.followUp.findFirst({
      where: { decisionId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (latest) {
      await prisma.followUp.update({
        where: { id: latest.id },
        data: {
          ...(followUpStatus ? { status: followUpStatus } : {}),
          ...(notes !== undefined ? { notes } : {}),
          ...(nextContact ? { nextContact: new Date(nextContact) } : {}),
          lastContact: new Date(),
        },
      })
    }

    revalidatePath('/admin/salvation')
    return NextResponse.json<ApiResult<{ decisionId: string }>>({ ok: true, data: { decisionId } })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'No database is connected yet.' },
        { status: 503 },
      )
    }
    console.error('[salvation/decisions PATCH]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not save that update.' }, { status: 500 })
  }
}
