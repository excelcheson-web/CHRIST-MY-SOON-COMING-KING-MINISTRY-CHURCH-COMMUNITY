import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { loadAnnouncements } from '@/lib/home-content'
import { canManageEvents } from '@/lib/permissions'
import { acceptImage } from '@/lib/uploads'
import { announcementSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/announcements — the boards this person may read. */
export async function GET() {
  const session = await auth()
  try {
    return jsonOk(await loadAnnouncements(session?.user))
  } catch (error) {
    return databaseError('announcements GET', error)
  }
}

/**
 * POST /api/announcements — post one. Leaders, pastors and administrators.
 *
 * Accepts multipart so a flyer can come with it. `canManageEvents` is the right
 * gate: it is already the "runs something in this church" permission, and a
 * departmental leader posting their own rota is exactly the intended use.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(session.user.role)) {
    return jsonError('Only ministry leaders can post announcements.', 403)
  }

  let fields: Record<string, unknown>
  let design: unknown = null

  const contentType = request.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      design = form.get('design')
      const text = (key: string) => {
        const value = form.get(key)
        return typeof value === 'string' && value ? value : undefined
      }
      fields = {
        title: text('title'),
        body: text('body'),
        ministryId: text('ministryId'),
        audience: text('audience'),
        startsAt: text('startsAt'),
        endsAt: text('endsAt'),
        pinned: form.get('pinned') === 'true',
      }
    } else {
      fields = (await request.json()) as Record<string, unknown>
    }
  } catch {
    return jsonError('We could not read that request.', 400)
  }

  const parsed = announcementSchema.safeParse(fields)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const upload = await acceptImage(design, 'design')
  if (!upload.ok) return upload.response

  try {
    const db = requirePrisma()
    const { ministryId, startsAt, ...rest } = parsed.data

    // A departmental announcement has to name a department that exists, or the
    // insert fails on a foreign key with a 500 instead of a clear message.
    let department: string | null = null
    if (ministryId) {
      const ministry = await db.ministry.findUnique({
        where: { id: ministryId },
        select: { id: true },
      })
      if (!ministry) return jsonError('We could not find that department.', 422)
      department = ministry.id
    }

    const created = await db.announcement.create({
      data: {
        ...rest,
        ministryId: department,
        startsAt: startsAt ?? new Date(),
        imageKey: upload.image?.key ?? null,
        imageWidth: upload.image?.width ?? null,
        imageHeight: upload.image?.height ?? null,
        createdById: session.user.id,
      },
      select: { id: true, title: true, audience: true },
    })

    revalidatePath('/')
    revalidatePath('/announcements')
    revalidatePath('/admin/announcements')
    return jsonOk(created, 201)
  } catch (error) {
    return databaseError('announcements POST', error)
  }
}

/** DELETE /api/announcements?id=… — take one down. */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(session.user.role)) return jsonError('Only leaders can do that.', 403)

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return jsonError('Which announcement?', 422)

  try {
    const db = requirePrisma()
    await db.announcement.delete({ where: { id } })
    revalidatePath('/')
    revalidatePath('/announcements')
    revalidatePath('/admin/announcements')
    return jsonOk({ deleted: true })
  } catch (error) {
    return databaseError('announcements DELETE', error)
  }
}
