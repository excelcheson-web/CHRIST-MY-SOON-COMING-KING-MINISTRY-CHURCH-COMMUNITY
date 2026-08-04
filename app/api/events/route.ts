import { EventStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
  databaseError,
  jsonError,
  jsonOk,
  readJson,
  requirePrisma,
} from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'
import { eventSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh() {
  revalidatePath('/events')
  revalidatePath('/admin/events')
  revalidatePath('/')
}

/** GET /api/events — published, upcoming events. Public. */
export async function GET(request: Request) {
  if (!prisma) return NextResponse.json<ApiResult<unknown[]>>({ ok: true, data: [] })

  const url = new URL(request.url)
  const includePast = url.searchParams.get('past') === '1'

  try {
    const events = await prisma.event.findMany({
      where: {
        status: { in: [EventStatus.PUBLISHED, EventStatus.CANCELLED] },
        ...(includePast ? {} : { startsAt: { gte: new Date() } }),
      },
      orderBy: { startsAt: includePast ? 'desc' : 'asc' },
      take: 60,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        type: true,
        startsAt: true,
        endsAt: true,
        locationName: true,
        isOnline: true,
        capacity: true,
        price: true,
        currency: true,
        status: true,
        isFeatured: true,
        requiresRegistration: true,
        ministry: { select: { name: true, slug: true } },
      },
    })

    return NextResponse.json<ApiResult<typeof events>>({ ok: true, data: events })
  } catch (error) {
    console.error('[events GET]', error)
    return jsonError('Could not load events.', 500)
  }
}

/** POST /api/events — create an event. Leaders, pastors and admins. */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(user.role)) return jsonError('Only ministry leaders can create events.', 403)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = eventSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  try {
    const db = requirePrisma()
    const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
      Boolean(await db.event.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const event = await db.event.create({
      data: { ...parsed.data, slug, createdById: user.id },
      select: { id: true, slug: true, title: true, status: true },
    })

    refresh()
    return jsonOk(event, 201)
  } catch (error) {
    return databaseError('events POST', error)
  }
}
