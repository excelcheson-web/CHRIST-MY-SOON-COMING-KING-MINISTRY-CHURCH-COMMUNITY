import { ApprovalStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { notifyTestimonyApproved } from '@/lib/notify'
import { canApproveTestimony } from '@/lib/permissions'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import { testimonyModerateSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh() {
  revalidatePath('/prayer/testimonies')
  revalidatePath('/admin/testimonies')
  revalidatePath('/')
}

/** PATCH /api/testimonies/[id] — approve, reject or feature a story. */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })
  if (!canApproveTestimony(user.role)) {
    return NextResponse.json<ApiResult>({ ok: false, error: 'Not allowed.' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResult>({ ok: false, error: 'We could not read that.' }, { status: 400 })
  }

  const parsed = testimonyModerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResult>(
      {
        ok: false,
        error: 'Please check the form.',
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      },
      { status: 422 },
    )
  }

  const { status, isFeatured, rejectReason } = parsed.data

  try {
    const db = requirePrisma()

    const before = await db.testimony.findUnique({
      where: { id: params.id },
      select: {
        status: true,
        title: true,
        guestName: true,
        guestEmail: true,
        author: { select: { name: true, email: true } },
      },
    })
    if (!before) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Testimony not found.' }, { status: 404 })
    }

    const updated = await db.testimony.update({
      where: { id: params.id },
      data: {
        ...(status ? { status } : {}),
        ...(isFeatured !== undefined ? { isFeatured } : {}),
        ...(rejectReason !== undefined ? { rejectReason } : {}),
        ...(status === ApprovalStatus.APPROVED
          ? { approvedById: user.id, approvedAt: new Date() }
          : status
            ? { approvedById: null, approvedAt: null, isFeatured: false }
            : {}),
      },
      select: { id: true, status: true, isFeatured: true, title: true },
    })

    // Tell the author only on the transition into APPROVED, not on every edit.
    if (status === ApprovalStatus.APPROVED && before.status !== ApprovalStatus.APPROVED) {
      await notifyTestimonyApproved(
        before.author ?? { name: before.guestName, email: before.guestEmail },
        updated.title,
      )
    }

    refresh()
    return NextResponse.json<ApiResult<typeof updated>>({ ok: true, data: updated })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'No database is connected yet.' }, { status: 503 })
    }
    console.error('[testimonies PATCH]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not save that.' }, { status: 500 })
  }
}

/** DELETE /api/testimonies/[id] — author may withdraw; moderators may remove. */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })

  try {
    const db = requirePrisma()
    const record = await db.testimony.findUnique({
      where: { id: params.id },
      select: { authorId: true },
    })
    if (!record) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Testimony not found.' }, { status: 404 })
    }

    if (record.authorId !== user.id && !canApproveTestimony(user.role)) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not allowed.' }, { status: 403 })
    }

    await db.testimony.delete({ where: { id: params.id } })
    refresh()
    return NextResponse.json<ApiResult<{ id: string }>>({ ok: true, data: { id: params.id } })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'No database is connected yet.' }, { status: 503 })
    }
    console.error('[testimonies DELETE]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not remove that.' }, { status: 500 })
  }
}
