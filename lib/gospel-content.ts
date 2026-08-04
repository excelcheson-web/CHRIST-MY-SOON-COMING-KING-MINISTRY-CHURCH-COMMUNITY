import 'server-only'

import { cache } from 'react'

import { commitmentPrayer, gospelSteps, nextSteps, type GospelStep } from '@/content/gospel'
import { prisma } from '@/lib/prisma'

/**
 * The salvation journey's wording, resolved database-first.
 *
 * Stored as structured fields rather than Markdown so the admin form can offer
 * a real field per idea — a pastor rewording step three should not have to
 * think about syntax, and a stray character should not be able to break the
 * page someone reads on the day they decide to follow Jesus.
 */

export type NextStep = { emoji: string; title: string; body: string }

export type GospelContent = {
  steps: GospelStep[]
  prayer: {
    title: string
    intro: string
    lines: string[]
    after: string
    afterVerse: { reference: string; text: string }
  }
  nextSteps: NextStep[]
  source: 'database' | 'bundled'
}

export function fallbackGospel(): GospelContent {
  return {
    steps: gospelSteps.map((step) => ({ ...step, body: [...step.body], verse: { ...step.verse } })),
    prayer: {
      title: commitmentPrayer.title,
      intro: commitmentPrayer.intro,
      lines: [...commitmentPrayer.lines],
      after: commitmentPrayer.after,
      afterVerse: { ...commitmentPrayer.afterVerse },
    },
    nextSteps: nextSteps.map((step) => ({ ...step })),
    source: 'bundled',
  }
}

function asSteps(value: unknown, fallback: GospelStep[]): GospelStep[] {
  if (!Array.isArray(value)) return fallback

  const parsed = value
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row, index) => {
      const verse = (row.verse ?? {}) as Record<string, unknown>
      return {
        id: String(row.id ?? `step-${index + 1}`),
        eyebrow: String(row.eyebrow ?? `Step ${index + 1}`),
        title: String(row.title ?? ''),
        body: Array.isArray(row.body) ? row.body.map(String).filter(Boolean) : [],
        verse: { reference: String(verse.reference ?? ''), text: String(verse.text ?? '') },
        emoji: String(row.emoji ?? '✝️'),
      }
    })
    .filter((step) => step.title)

  return parsed.length > 0 ? parsed : fallback
}

function asNextSteps(value: unknown, fallback: NextStep[]): NextStep[] {
  if (!Array.isArray(value)) return fallback

  const parsed = value
    .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null)
    .map((row) => ({
      emoji: String(row.emoji ?? '•'),
      title: String(row.title ?? ''),
      body: String(row.body ?? ''),
    }))
    .filter((step) => step.title)

  return parsed.length > 0 ? parsed : fallback
}

export const getGospelContent = cache(async (): Promise<GospelContent> => {
  const fallback = fallbackGospel()
  if (!prisma) return fallback

  try {
    const row = await prisma.gospelContent.findUnique({ where: { id: 'singleton' } })
    if (!row) return fallback

    return {
      steps: asSteps(row.steps, fallback.steps),
      prayer: {
        title: row.prayerTitle,
        intro: row.prayerIntro,
        lines: row.prayerLines.length > 0 ? row.prayerLines : fallback.prayer.lines,
        after: row.prayerAfter,
        afterVerse: { reference: row.afterVerseReference, text: row.afterVerseText },
      },
      nextSteps: asNextSteps(row.nextSteps, fallback.nextSteps),
      source: 'database',
    }
  } catch (error) {
    console.error('[gospel-content] falling back to bundled copy:', error)
    return fallback
  }
})
