import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'
import { sermonSeriesSchema } from '@/lib/validations'
import type { ApiResult } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/sermons/series — every series, newest first. Public. */
export async function GET() {
  if (!prisma) return NextResponse.json<ApiResult<unknown[]>>({ ok: true, data: [] })

  try {
    const series = await prisma.sermonSeries.findMany({
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        image: true,
        startDate: true,
        endDate: true,
        isActive: true,
        _count: { select: { sermons: true } },
      },
    })
    return jsonOk(series)
  } catch (error) {
    return databaseError('series GET', error)
  }
}

/** POST /api/sermons/series — start a new series. Pastors and administrators. */
export async function POST(request: Request) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageContent(user.role)) {
    return jsonError('Only pastors and administrators can manage series.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = sermonSeriesSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
      Boolean(
        await db.sermonSeries.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    )

    const series = await db.sermonSeries.create({
      data: { ...parsed.data, slug },
      select: { id: true, slug: true, title: true },
    })

    revalidatePath('/sermons')
    revalidatePath('/admin/sermons')
    return jsonOk(series, 201)
  } catch (error) {
    return databaseError('series POST', error)
  }
}
