import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requireContentApi, requirePrisma } from '@/lib/api-guards'
import { gospelContentSchema, siteSettingsSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Identity and contact details appear on every page, so a save has to clear
 * the whole site rather than one route.
 */
function refreshEverything() {
  revalidatePath('/', 'layout')
}

/** PUT /api/admin/settings — ministry identity, contact and service times. */
export async function PUT(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = siteSettingsSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const { facebook, youtube, instagram, serviceTimes, ...rest } = parsed.data

  try {
    const prisma = requirePrisma()

    const saved = await prisma.siteSetting.upsert({
      where: { id: 'singleton' },
      update: { ...rest, serviceTimes, socials: { facebook, youtube, instagram } },
      create: {
        id: 'singleton',
        ...rest,
        serviceTimes,
        socials: { facebook, youtube, instagram },
      },
      select: { name: true, updatedAt: true },
    })

    refreshEverything()
    return jsonOk({ ...saved, updatedAt: saved.updatedAt.toISOString() })
  } catch (error) {
    return databaseError('admin settings PUT', error)
  }
}

/** DELETE — drop back to the values in `lib/site.ts`. */
export async function DELETE() {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  try {
    const prisma = requirePrisma()
    await prisma.siteSetting.delete({ where: { id: 'singleton' } }).catch(() => null)
    refreshEverything()
    return jsonOk({ reverted: true })
  } catch (error) {
    return databaseError('admin settings DELETE', error)
  }
}

/** PATCH /api/admin/settings — the salvation journey's wording. */
export async function PATCH(request: Request) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = gospelContentSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const data = parsed.data

  // Flatten the form's verse fields back into the shape the pages read.
  const steps = data.steps.map((step, index) => ({
    id: step.id || `step-${index + 1}`,
    eyebrow: step.eyebrow || `Step ${index + 1} of ${data.steps.length}`,
    title: step.title,
    body: step.body,
    verse: { reference: step.verseReference, text: step.verseText },
    emoji: step.emoji,
  }))

  try {
    const prisma = requirePrisma()

    const payload = {
      steps,
      prayerTitle: data.prayerTitle,
      prayerIntro: data.prayerIntro,
      prayerLines: data.prayerLines,
      prayerAfter: data.prayerAfter,
      afterVerseReference: data.afterVerseReference,
      afterVerseText: data.afterVerseText,
      nextSteps: data.nextSteps,
    }

    const saved = await prisma.gospelContent.upsert({
      where: { id: 'singleton' },
      update: payload,
      create: { id: 'singleton', ...payload },
      select: { updatedAt: true },
    })

    revalidatePath('/salvation/gospel')
    revalidatePath('/salvation/prayer')
    revalidatePath('/salvation/complete')
    revalidatePath('/admin/gospel')

    return jsonOk({ updatedAt: saved.updatedAt.toISOString(), steps: steps.length })
  } catch (error) {
    return databaseError('admin gospel PATCH', error)
  }
}
