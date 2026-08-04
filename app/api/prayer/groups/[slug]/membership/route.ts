import type { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getApiUser } from '@/lib/auth'
import { syncGroupConversation } from '@/lib/chat'
import { DatabaseNotConfiguredError, requirePrisma } from '@/lib/prisma'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MembershipResult = { joined: boolean; memberCount: number }

async function loadGroup(slug: string) {
  const db = requirePrisma()
  return db.prayerGroup.findUnique({
    where: { slug },
    select: { id: true, isPublic: true, isActive: true, name: true },
  })
}

/**
 * Keeps the group's chat roster in step with the group itself.
 *
 * Deliberately best-effort: joining a prayer group must not fail because the
 * chat table had a bad moment.
 */
async function syncConversationFor(db: PrismaClient, groupId: string, name: string) {
  try {
    const members = await db.prayerGroupMember.findMany({
      where: { groupId },
      select: { userId: true },
    })
    await syncGroupConversation(db, 'prayerGroup', groupId, name, members.map((m) => m.userId))
  } catch (error) {
    console.error('[prayer group chat sync]', error)
  }
}

/** POST — join a public prayer group. */
export async function POST(_request: Request, { params }: { params: { slug: string } }) {
  const user = await getApiUser()
  if (!user) {
    return NextResponse.json<ApiResult>(
      { ok: false, error: 'Please sign in to join a prayer group.' },
      { status: 401 },
    )
  }

  try {
    const db = requirePrisma()
    const group = await loadGroup(params.slug)

    if (!group || !group.isActive) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Group not found.' }, { status: 404 })
    }
    if (!group.isPublic) {
      return NextResponse.json<ApiResult>(
        { ok: false, error: 'This group is invite-only. Please speak to the prayer team.' },
        { status: 403 },
      )
    }

    // Upsert rather than create: joining twice is a no-op, not an error.
    await db.prayerGroupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: user.id } },
      update: {},
      create: { groupId: group.id, userId: user.id },
    })

    const memberCount = await db.prayerGroupMember.count({ where: { groupId: group.id } })
    await syncConversationFor(db, group.id, group.name)

    revalidatePath('/prayer/groups')
    revalidatePath(`/prayer/groups/${params.slug}`)
    return NextResponse.json<ApiResult<MembershipResult>>({
      ok: true,
      data: { joined: true, memberCount },
    })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[prayer/groups join]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not join that group.' }, { status: 500 })
  }
}

/** DELETE — leave a prayer group. */
export async function DELETE(_request: Request, { params }: { params: { slug: string } }) {
  const user = await getApiUser()
  if (!user) return NextResponse.json<ApiResult>({ ok: false, error: 'Please sign in.' }, { status: 401 })

  try {
    const db = requirePrisma()
    const group = await loadGroup(params.slug)
    if (!group) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Group not found.' }, { status: 404 })
    }

    await db.prayerGroupMember
      .delete({ where: { groupId_userId: { groupId: group.id, userId: user.id } } })
      .catch(() => null) // leaving a group you are not in is not an error

    const memberCount = await db.prayerGroupMember.count({ where: { groupId: group.id } })
    await syncConversationFor(db, group.id, group.name)

    revalidatePath('/prayer/groups')
    revalidatePath(`/prayer/groups/${params.slug}`)
    return NextResponse.json<ApiResult<MembershipResult>>({
      ok: true,
      data: { joined: false, memberCount },
    })
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json<ApiResult>({ ok: false, error: 'Not available yet.' }, { status: 503 })
    }
    console.error('[prayer/groups leave]', error)
    return NextResponse.json<ApiResult>({ ok: false, error: 'Could not leave that group.' }, { status: 500 })
  }
}
