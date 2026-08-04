import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { startOfDay } from '@/lib/church-year'
import { pastorsWordToday } from '@/lib/home-content'
import { canManageContent } from '@/lib/permissions'
import { pastorsWordSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/pastors-word — today's word. Never empty. Public. */
export async function GET() {
  try {
    return jsonOk(await pastorsWordToday())
  } catch (error) {
    return databaseError('pastors word GET', error)
  }
}

/**
 * PUT /api/pastors-word — write or replace the word for a day.
 *
 * Upserts on the day, so re-saving the same date edits rather than failing on
 * the unique index, and a pastor can write a week ahead in one sitting.
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) {
    return jsonError('Only pastors and administrators can write this.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = pastorsWordSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const showOn = startOfDay(parsed.data.showOn)
    const data = { ...parsed.data, showOn, createdById: session.user.id }

    const saved = await db.pastorsWord.upsert({
      where: { showOn },
      update: data,
      create: data,
      select: { id: true, showOn: true, title: true },
    })

    revalidatePath('/')
    revalidatePath('/admin/pastors-word')
    return jsonOk({ ...saved, showOn: saved.showOn.toISOString() })
  } catch (error) {
    return databaseError('pastors word PUT', error)
  }
}

/**
 * DELETE /api/pastors-word?date=… — revert a day to the bundled rotation.
 *
 * Deleting is safe precisely because the rotation is always there: the section
 * falls back to it rather than going blank.
 */
export async function DELETE(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) return jsonError('Only pastors can do that.', 403)

  const date = new URL(request.url).searchParams.get('date')
  if (!date || Number.isNaN(Date.parse(date))) return jsonError('Which day?', 422)

  try {
    const db = requirePrisma()
    await db.pastorsWord.delete({ where: { showOn: startOfDay(new Date(date)) } }).catch(() => null)
    revalidatePath('/')
    revalidatePath('/admin/pastors-word')
    return jsonOk({ reverted: true })
  } catch (error) {
    return databaseError('pastors word DELETE', error)
  }
}
