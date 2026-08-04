import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { upcomingChurchDates } from '@/lib/home-content'
import { canManageContent } from '@/lib/permissions'
import { acceptImage } from '@/lib/uploads'
import { calendarDateSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/calendar — the next observances, with any church overrides. Public. */
export async function GET(request: Request) {
  const take = Math.min(Number(new URL(request.url).searchParams.get('take') ?? 6) || 6, 20)
  try {
    return jsonOk(await upcomingChurchDates(take))
  } catch (error) {
    return databaseError('calendar GET', error)
  }
}

/**
 * PUT /api/calendar — override a date's wording and artwork, or add one.
 *
 * Upserts on `key`. Overriding `easter` changes what it is called and what
 * picture sits beside it; it cannot change *when* Easter is, because that is
 * computed in lib/church-year.ts and is arithmetic rather than opinion.
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) {
    return jsonError('Only pastors and administrators can edit the calendar.', 403)
  }

  let fields: Record<string, unknown>
  let art: unknown = null

  const contentType = request.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData()
      art = form.get('art')
      const text = (key: string) => {
        const value = form.get(key)
        return typeof value === 'string' && value ? value : undefined
      }
      fields = {
        key: text('key'),
        title: text('title'),
        description: text('description'),
        month: text('month'),
        day: text('day'),
        onceOn: text('onceOn'),
        image: text('image'),
        accent: text('accent'),
        isActive: form.get('isActive') !== 'false',
        order: text('order') ?? 0,
      }
    } else {
      fields = (await request.json()) as Record<string, unknown>
    }
  } catch {
    return jsonError('We could not read that request.', 400)
  }

  const parsed = calendarDateSchema.safeParse(fields)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const upload = await acceptImage(art, 'picture')
  if (!upload.ok) return upload.response

  try {
    const db = requirePrisma()
    const { key, month, day, onceOn, ...rest } = parsed.data

    const data = {
      ...rest,
      month: month ?? null,
      day: day ?? null,
      onceOn: onceOn ?? null,
      ...(upload.image ? { imageKey: upload.image.key } : {}),
    }

    const saved = await db.calendarDate.upsert({
      where: { key },
      update: data,
      create: { key, ...data },
      select: { id: true, key: true, title: true, isActive: true },
    })

    revalidatePath('/')
    revalidatePath('/admin/calendar')
    return jsonOk(saved)
  } catch (error) {
    return databaseError('calendar PUT', error)
  }
}

/** DELETE /api/calendar?key=… — drop an override, restoring the built-in date. */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) return jsonError('Only pastors can do that.', 403)

  const key = new URL(request.url).searchParams.get('key')
  if (!key) return jsonError('Which date?', 422)

  try {
    const db = requirePrisma()
    await db.calendarDate.delete({ where: { key } }).catch(() => null)
    revalidatePath('/')
    revalidatePath('/admin/calendar')
    return jsonOk({ reverted: true })
  } catch (error) {
    return databaseError('calendar DELETE', error)
  }
}
