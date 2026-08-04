import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { sermonCardSelect, sermonFilterWhere, sermonWhere, toSermonCard } from '@/lib/sermons'
import { uniqueSlug } from '@/lib/slug'
import { sermonSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 * Local rather than shared: a route file may only export the HTTP verbs plus
 * Next's own config keys, so a helper exported from here would break the build.
 */
function refreshSermons() {
  revalidatePath('/sermons')
  revalidatePath('/admin/sermons')
  revalidatePath('/')
}

/** GET /api/sermons — published sermons, with search and filters. Public. */
export async function GET(request: Request) {
  if (!prisma) return NextResponse.json<ApiResult<unknown[]>>({ ok: true, data: [] })

  const url = new URL(request.url)
  const user = await getApiUser()
  const canManage = canManageContent(user?.role)

  const take = Math.min(Number(url.searchParams.get('take') ?? 24) || 24, 60)
  const skip = Math.max(Number(url.searchParams.get('skip') ?? 0) || 0, 0)

  try {
    const records = await prisma.sermon.findMany({
      where: {
        AND: [
          sermonWhere(canManage),
          sermonFilterWhere({
            q: url.searchParams.get('q') ?? undefined,
            series: url.searchParams.get('series') ?? undefined,
            speaker: url.searchParams.get('speaker') ?? undefined,
            topic: url.searchParams.get('topic') ?? undefined,
          }),
        ],
      },
      select: sermonCardSelect,
      orderBy: [{ preachedAt: 'desc' }],
      take,
      skip,
    })

    return jsonOk(records.map(toSermonCard))
  } catch (error) {
    return databaseError('sermons GET', error)
  }
}

/** POST /api/sermons — add a sermon. Pastors and administrators. */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageContent(user.role)) {
    return jsonError('Only pastors and administrators can add sermons.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = sermonSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const { seriesId, ministryId, ...rest } = parsed.data

    const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
      Boolean(await db.sermon.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const sermon = await db.sermon.create({
      data: {
        ...rest,
        slug,
        createdById: user.id,
        // Empty string from an unselected dropdown must become null, not "".
        seriesId: seriesId || null,
        ministryId: ministryId || null,
      },
      select: { id: true, slug: true, title: true, status: true },
    })

    refreshSermons()
    return jsonOk(sermon, 201)
  } catch (error) {
    return databaseError('sermons POST', error)
  }
}
