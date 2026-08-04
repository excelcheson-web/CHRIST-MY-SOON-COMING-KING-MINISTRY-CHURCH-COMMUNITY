import { SermonStatus } from '@prisma/client'

import { aiConfig } from '@/lib/ai'
import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { actorKeyFor, ensureGuestId } from '@/lib/guest-session'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { answerFromSermon, normaliseQuestion } from '@/lib/sermon-qa'
import { askSermonSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/sermons/[slug]/ask — ask a question about a sermon.
 *
 * Public, because the sermons are. Three things keep it inside a free tier:
 *
 * - **Answers are cached** by (sermon, normalised question). The tenth person
 *   to ask "what about forgiveness" costs nothing.
 * - **Rate limited** per browser, so one person cannot burn the day's quota.
 * - **Retrieval runs first**, and is what gets returned when no model is
 *   configured or the call fails — so the feature works with the quota at zero.
 */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  sweepRateLimits()

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = askSermonSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please write a question first.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const user = await getApiUser()
  const actorKey = actorKeyFor(user?.id, ensureGuestId())

  // Generous for a person, tight enough that a script cannot drain the quota.
  const limit = rateLimit(`ask:${actorKey}:${clientIp(request.headers)}`, 20, 60 * 60 * 1000)
  if (!limit.ok) {
    return jsonError(
      'That is a lot of questions at once. Please try again in a little while.',
      429,
    )
  }

  try {
    const db = requirePrisma()

    const sermon = await db.sermon.findUnique({
      where: { slug: params.slug },
      select: { id: true, status: true, transcript: true, notes: true, title: true },
    })
    // Drafts are unfinished and archived sermons were taken down. Neither may
    // be queried, and neither may be sent anywhere.
    if (!sermon || sermon.status !== SermonStatus.PUBLISHED) {
      return jsonError('We could not find that sermon.', 404)
    }

    // Notes count as transcript for this purpose — they are on the same public
    // page, and a sermon with notes but no transcript is still worth asking.
    const source = [sermon.transcript, sermon.notes].filter(Boolean).join('\n\n')
    if (source.trim().length < 200) {
      return jsonError(
        'This sermon does not have a transcript yet, so there is nothing to search.',
        409,
      )
    }

    const normalised = normaliseQuestion(parsed.data.question)
    const config = aiConfig()

    const cached = await db.sermonQuestion.findUnique({
      where: { sermonId_normalised: { sermonId: sermon.id, normalised } },
    })

    /*
     * A cached row is reused only if it came from the provider now configured.
     * Switching from "no AI" to Gemini should not leave everybody looking at
     * the old answerless result forever.
     */
    if (cached && cached.provider === (config.ready ? config.provider : null)) {
      await db.sermonQuestion.update({
        where: { id: cached.id },
        data: { askCount: { increment: 1 } },
      })

      const passages = await rebuildPassages(source, cached.passages)
      return jsonOk({
        answer: cached.answer,
        passages,
        cached: true,
        provider: cached.provider,
        fallback: cached.answer ? null : 'not-configured',
      })
    }

    const result = await answerFromSermon({ transcript: source, question: parsed.data.question })

    if (result.passages.length === 0) {
      return jsonOk({
        answer: null,
        passages: [],
        cached: false,
        provider: null,
        fallback: 'no-match',
      })
    }

    // Store it — both as a cache and as something a pastor can read later.
    await db.sermonQuestion
      .upsert({
        where: { sermonId_normalised: { sermonId: sermon.id, normalised } },
        update: {
          question: parsed.data.question,
          answer: result.answer,
          provider: result.provider,
          passages: result.passages.map((passage) => passage.index),
          askCount: { increment: 1 },
        },
        create: {
          sermonId: sermon.id,
          normalised,
          question: parsed.data.question,
          answer: result.answer,
          provider: result.provider,
          passages: result.passages.map((passage) => passage.index),
        },
      })
      // A failed cache write must not lose the answer the person is waiting for.
      .catch((error) => console.error('[ask cache]', error))

    return jsonOk({
      answer: result.answer,
      passages: result.passages.map((passage) => passage.text),
      cached: false,
      provider: result.provider,
      fallback: result.fallback,
    })
  } catch (error) {
    return databaseError('sermon ask', error)
  }
}

/** Re-slices the transcript to recover the passages a cached answer used. */
async function rebuildPassages(source: string, indexes: number[]) {
  const { splitPassages } = await import('@/lib/sermon-qa')
  const all = splitPassages(source)
  return indexes.map((index) => all[index]).filter((text): text is string => Boolean(text))
}
