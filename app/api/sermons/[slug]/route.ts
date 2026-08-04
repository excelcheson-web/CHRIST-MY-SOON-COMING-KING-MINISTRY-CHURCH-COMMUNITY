import { SermonStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'
import { sermonUpdateSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh(slug: string) {
  revalidatePath('/sermons')
  revalidatePath(`/sermons/${slug}`)
  revalidatePath('/admin/sermons')
}

type Params = { params: { slug: string } }

/** GET /api/sermons/[slug] — one sermon. Drafts need a content manager. */
export async function GET(_request: Request, { params }: Params) {
  if (!prisma) return jsonError('No database is connected yet.', 503)

  try {
    const sermon = await prisma.sermon.findUnique({
      where: { slug: params.slug },
      include: { series: { select: { title: true, slug: true } } },
    })
    if (!sermon) return jsonError('We could not find that sermon.', 404)

    if (sermon.status !== SermonStatus.PUBLISHED) {
      const user = await getApiUser()
      if (!canManageContent(user?.role)) return jsonError('We could not find that sermon.', 404)
    }

    return jsonOk(sermon)
  } catch (error) {
    return databaseError('sermon GET', error)
  }
}

/** PATCH /api/sermons/[slug] — edit a sermon. Pastors and administrators. */
export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageContent(user.role)) {
    return jsonError('Only pastors and administrators can edit sermons.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = sermonUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const existing = await db.sermon.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, title: true },
    })
    if (!existing) return jsonError('We could not find that sermon.', 404)

    const { seriesId, ministryId, title, ...rest } = parsed.data

    /*
     * Retitling moves the sermon's URL. That is the right default — a stale
     * slug reading "guest-speaker-tbc" is worse than a changed link — but the
     * old one is left to 404 rather than silently redirecting, so a pastor who
     * renamed something by accident notices immediately.
     */
    const slug =
      title && title !== existing.title
        ? await uniqueSlug(title, async (candidate) => {
            const row = await db.sermon.findUnique({
              where: { slug: candidate },
              select: { id: true },
            })
            return Boolean(row) && row?.id !== existing.id
          })
        : existing.slug

    const sermon = await db.sermon.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(title ? { title } : {}),
        slug,
        ...(seriesId !== undefined ? { seriesId: seriesId || null } : {}),
        ...(ministryId !== undefined ? { ministryId: ministryId || null } : {}),
      },
      select: { id: true, slug: true, title: true, status: true },
    })

    refresh(existing.slug)
    if (sermon.slug !== existing.slug) refresh(sermon.slug)
    return jsonOk(sermon)
  } catch (error) {
    return databaseError('sermon PATCH', error)
  }
}

/**
 * DELETE /api/sermons/[slug] — archive, or hard-delete on the second pass.
 *
 * Archiving first means a mis-click cannot destroy a transcript someone spent
 * an evening typing. `?permanent=1` removes it for good, and is only offered
 * from the admin screen once the sermon is already archived.
 */
export async function DELETE(request: Request, { params }: Params) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageContent(user.role)) {
    return jsonError('Only pastors and administrators can remove sermons.', 403)
  }

  const permanent = new URL(request.url).searchParams.get('permanent') === '1'

  try {
    const db = requirePrisma()
    const existing = await db.sermon.findUnique({
      where: { slug: params.slug },
      select: { id: true, status: true },
    })
    if (!existing) return jsonError('We could not find that sermon.', 404)

    if (permanent) {
      await db.sermon.delete({ where: { id: existing.id } })
      refresh(params.slug)
      return jsonOk({ deleted: true, archived: false })
    }

    await db.sermon.update({
      where: { id: existing.id },
      data: { status: SermonStatus.ARCHIVED, isFeatured: false },
    })
    refresh(params.slug)
    return jsonOk({ deleted: false, archived: true })
  } catch (error) {
    return databaseError('sermon DELETE', error)
  }
}
