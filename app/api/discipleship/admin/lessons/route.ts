import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import {
  databaseError,
  jsonError,
  jsonOk,
  readJson,
  requireContentApi,
  requirePrisma,
} from '@/lib/api-guards'
import { uniqueSlug } from '@/lib/slug'
import { lessonSchema, lessonUpdateSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh() {
  revalidatePath('/discipleship')
  revalidatePath('/admin/discipleship')
}

const DUPLICATE_ORDER = 'That lesson number is already used in this week.'

/** POST /api/discipleship/admin/lessons — add a lesson to a week. */
export async function POST(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = lessonSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  try {
    const prisma = requirePrisma()
    const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
      Boolean(
        await prisma.discipleshipLesson.findUnique({ where: { slug: candidate }, select: { id: true } }),
      ),
    )

    const lesson = await prisma.discipleshipLesson.create({
      data: { ...parsed.data, slug },
      select: { id: true, slug: true, title: true, order: true },
    })

    refresh()
    return jsonOk(lesson, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(DUPLICATE_ORDER, 409, { order: [DUPLICATE_ORDER] })
    }
    return databaseError('discipleship/admin/lessons POST', error)
  }
}

/**
 * PATCH /api/discipleship/admin/lessons — update a lesson (id in the body).
 *
 * The slug is intentionally *not* regenerated when the title changes: existing
 * progress records and any links people have shared are keyed to it.
 */
export async function PATCH(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = lessonUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const { id, weekId, order, title, content, bibleVerses, reflectionQuestions, videoUrl, audioUrl } =
    parsed.data

  try {
    const prisma = requirePrisma()
    const lesson = await prisma.discipleshipLesson.update({
      where: { id },
      data: {
        ...(weekId !== undefined ? { weekId } : {}),
        ...(order !== undefined ? { order } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content } : {}),
        ...(bibleVerses !== undefined ? { bibleVerses } : {}),
        ...(reflectionQuestions !== undefined ? { reflectionQuestions } : {}),
        ...(videoUrl !== undefined ? { videoUrl } : {}),
        ...(audioUrl !== undefined ? { audioUrl } : {}),
      },
      select: { id: true, slug: true, title: true, order: true },
    })

    refresh()
    return jsonOk(lesson)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(DUPLICATE_ORDER, 409, { order: [DUPLICATE_ORDER] })
    }
    return databaseError('discipleship/admin/lessons PATCH', error)
  }
}

/** DELETE /api/discipleship/admin/lessons?id=… */
export async function DELETE(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return jsonError('A lesson id is required.', 422)

  try {
    const prisma = requirePrisma()
    await prisma.discipleshipLesson.delete({ where: { id } })
    refresh()
    return jsonOk({ id })
  } catch (error) {
    return databaseError('discipleship/admin/lessons DELETE', error)
  }
}
