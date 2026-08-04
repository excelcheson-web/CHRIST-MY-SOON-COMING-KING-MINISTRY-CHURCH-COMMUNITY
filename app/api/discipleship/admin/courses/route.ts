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
import { courseSchema, courseUpdateSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh() {
  revalidatePath('/discipleship')
  revalidatePath('/admin/discipleship')
}

/** POST /api/discipleship/admin/courses — create a course. */
export async function POST(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = courseSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  try {
    const prisma = requirePrisma()
    const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
      Boolean(await prisma.discipleshipCourse.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const course = await prisma.discipleshipCourse.create({
      data: { ...parsed.data, slug },
      select: { id: true, slug: true, title: true },
    })

    refresh()
    return jsonOk(course, 201)
  } catch (error) {
    return databaseError('discipleship/admin/courses POST', error)
  }
}

/** PATCH /api/discipleship/admin/courses — update a course (id in the body). */
export async function PATCH(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = courseUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const { id, title, description, difficulty, image, isActive, order } = parsed.data

  try {
    const prisma = requirePrisma()
    const course = await prisma.discipleshipCourse.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(difficulty !== undefined ? { difficulty } : {}),
        ...(image !== undefined ? { image } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(order !== undefined ? { order } : {}),
      },
      select: { id: true, slug: true, title: true },
    })

    refresh()
    return jsonOk(course)
  } catch (error) {
    return databaseError('discipleship/admin/courses PATCH', error)
  }
}

/** DELETE /api/discipleship/admin/courses?id=… — removes the course and its weeks/lessons. */
export async function DELETE(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return jsonError('A course id is required.', 422)

  try {
    const prisma = requirePrisma()

    const enrolled = await prisma.discipleshipProgress.count({ where: { courseId: id } })
    if (enrolled > 0) {
      // Deleting would erase real people's progress. Retire it instead.
      await prisma.discipleshipCourse.update({ where: { id }, data: { isActive: false } })
      refresh()
      return jsonOk({ id, retired: true, enrolled })
    }

    await prisma.discipleshipCourse.delete({ where: { id } })
    refresh()
    return jsonOk({ id, retired: false, enrolled: 0 })
  } catch (error) {
    return databaseError('discipleship/admin/courses DELETE', error)
  }
}
