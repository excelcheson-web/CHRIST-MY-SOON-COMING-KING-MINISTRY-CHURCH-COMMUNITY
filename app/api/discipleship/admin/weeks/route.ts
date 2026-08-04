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
import { weekSchema, weekUpdateSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh() {
  revalidatePath('/discipleship')
  revalidatePath('/admin/discipleship')
}

const DUPLICATE_WEEK = 'That week number is already used in this course.'

/** POST /api/discipleship/admin/weeks — add a week to a course. */
export async function POST(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = weekSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  try {
    const prisma = requirePrisma()
    const week = await prisma.discipleshipWeek.create({
      data: parsed.data,
      select: { id: true, weekNumber: true, title: true },
    })

    refresh()
    return jsonOk(week, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(DUPLICATE_WEEK, 409, { weekNumber: [DUPLICATE_WEEK] })
    }
    return databaseError('discipleship/admin/weeks POST', error)
  }
}

/** PATCH /api/discipleship/admin/weeks — update a week (id in the body). */
export async function PATCH(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = weekUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const { id, weekNumber, title, description } = parsed.data

  try {
    const prisma = requirePrisma()
    const week = await prisma.discipleshipWeek.update({
      where: { id },
      data: {
        ...(weekNumber !== undefined ? { weekNumber } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
      },
      select: { id: true, weekNumber: true, title: true },
    })

    refresh()
    return jsonOk(week)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError(DUPLICATE_WEEK, 409, { weekNumber: [DUPLICATE_WEEK] })
    }
    return databaseError('discipleship/admin/weeks PATCH', error)
  }
}

/** DELETE /api/discipleship/admin/weeks?id=… — also removes its lessons. */
export async function DELETE(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return jsonError('A week id is required.', 422)

  try {
    const prisma = requirePrisma()
    await prisma.discipleshipWeek.delete({ where: { id } })
    refresh()
    return jsonOk({ id })
  } catch (error) {
    return databaseError('discipleship/admin/weeks DELETE', error)
  }
}
