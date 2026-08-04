import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { dailyVerseSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 * Local, not exported: a route file may only export the HTTP verbs plus Next's
 * own config keys. The shared copy lives in lib/initiatives.ts.
 */
const startOfDay = (date = new Date()) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * GET /api/community/verse — today's verse, or the most recent one.
 *
 * Falls back to the latest past verse rather than showing nothing, so a day
 * nobody scheduled still has something to read.
 */
export async function GET() {
  if (!prisma) return jsonOk(null)

  try {
    const today = startOfDay()
    const verse =
      (await prisma.dailyVerse.findUnique({ where: { showOn: today } })) ??
      (await prisma.dailyVerse.findFirst({
        where: { showOn: { lte: today } },
        orderBy: { showOn: 'desc' },
      }))

    return jsonOk(
      verse ? { ...verse, showOn: verse.showOn.toISOString(), isToday: verse.showOn.getTime() === today.getTime() } : null,
    )
  } catch (error) {
    return databaseError('verse GET', error)
  }
}

/** PUT /api/community/verse — schedule a verse. Pastors and administrators. */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) {
    return jsonError('Only pastors and administrators can set the verse.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = dailyVerseSchema.safeParse(body)
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

    // Upsert on the day: re-scheduling the same date replaces it rather than
    // failing on the unique index.
    const saved = await db.dailyVerse.upsert({
      where: { showOn },
      update: data,
      create: data,
      select: { id: true, showOn: true, reference: true },
    })

    revalidatePath('/community/verse')
    revalidatePath('/admin/verse')
    return jsonOk({ ...saved, showOn: saved.showOn.toISOString() })
  } catch (error) {
    return databaseError('verse PUT', error)
  }
}
