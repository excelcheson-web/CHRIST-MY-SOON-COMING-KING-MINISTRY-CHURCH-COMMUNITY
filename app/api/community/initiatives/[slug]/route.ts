import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { currentDayNumber, progressFor, totalDays } from '@/lib/initiatives'
import { touchActivity } from '@/lib/profiles'
import { initiativeJoinSchema, initiativeLogSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: { slug: string } }

/** POST /api/community/initiatives/[slug] — join, or log a day. */
export async function POST(request: Request, { params }: Params) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to take part.', 401)
  const userId = session.user.id

  const { body, response } = await readJson(request)
  if (response) return response

  const action = (body as { action?: string })?.action ?? 'join'

  try {
    const db = requirePrisma()
    const initiative = await db.initiative.findUnique({
      where: { slug: params.slug },
      select: { id: true, slug: true, startsOn: true, endsOn: true, isActive: true },
    })
    if (!initiative || !initiative.isActive) return jsonError('We could not find that.', 404)

    if (action === 'leave') {
      await db.initiativeMember
        .delete({ where: { initiativeId_userId: { initiativeId: initiative.id, userId } } })
        .catch(() => null)
      revalidatePath(`/community/growing/${initiative.slug}`)
      return jsonOk({ joined: false })
    }

    if (action === 'log') {
      const parsed = initiativeLogSchema.safeParse(body)
      if (!parsed.success) return jsonError('Which day?', 422)

      const total = totalDays(initiative)
      if (parsed.data.dayNumber > total) {
        return jsonError('That day is past the end of this one.', 422)
      }

      // Joining is implied by logging — nobody should have to press two buttons
      // to say they read today.
      await db.initiativeMember.upsert({
        where: { initiativeId_userId: { initiativeId: initiative.id, userId } },
        update: {},
        create: { initiativeId: initiative.id, userId },
      })

      const day = await db.initiativeDay.findUnique({
        where: {
          initiativeId_dayNumber: { initiativeId: initiative.id, dayNumber: parsed.data.dayNumber },
        },
        select: { id: true },
      })

      try {
        await db.initiativeLog.create({
          data: {
            initiativeId: initiative.id,
            userId,
            dayId: day?.id ?? null,
            dayNumber: parsed.data.dayNumber,
            note: parsed.data.note ?? null,
          },
        })
      } catch (error) {
        // Already logged. Update the note rather than refusing — somebody
        // coming back to add what God said should not hit an error.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          await db.initiativeLog.update({
            where: {
              initiativeId_userId_dayNumber: {
                initiativeId: initiative.id,
                userId,
                dayNumber: parsed.data.dayNumber,
              },
            },
            data: { note: parsed.data.note ?? null },
          })
        } else {
          throw error
        }
      }

      const progress = await progressFor(initiative.id, userId)

      // Finished every day? Mark it, so the badge and the record are true.
      if (progress.logged >= total) {
        await db.initiativeMember.update({
          where: { initiativeId_userId: { initiativeId: initiative.id, userId } },
          data: { completedAt: new Date() },
        })
      }

      await touchActivity(userId)
      revalidatePath(`/community/growing/${initiative.slug}`)
      return jsonOk({
        logged: progress.logged,
        total,
        completed: progress.logged >= total,
        today: currentDayNumber(initiative),
      })
    }

    // Default: join.
    const parsed = initiativeJoinSchema.safeParse(body)
    const data = parsed.success ? parsed.data : { intent: undefined, visible: true }

    await db.initiativeMember.upsert({
      where: { initiativeId_userId: { initiativeId: initiative.id, userId } },
      update: { intent: data.intent ?? null, visible: data.visible },
      create: {
        initiativeId: initiative.id,
        userId,
        intent: data.intent ?? null,
        visible: data.visible,
      },
    })

    await touchActivity(userId)
    revalidatePath(`/community/growing/${initiative.slug}`)
    return jsonOk({ joined: true })
  } catch (error) {
    return databaseError('initiative POST', error)
  }
}
