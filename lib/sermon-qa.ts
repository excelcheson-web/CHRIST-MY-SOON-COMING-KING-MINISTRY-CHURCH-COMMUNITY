import 'server-only'

import { askGrounded, markPublic, type AiProvider } from '@/lib/ai'

/**
 * "Ask this sermon."
 *
 * Two layers, and **the first one needs no AI, no key and no account**:
 *
 * 1. **Retrieval (always).** The transcript is split into passages and ranked
 *    against the question with BM25. The best three are shown verbatim. For a
 *    question like "what did he say about forgiveness?" that *is* the answer,
 *    in the preacher's own words, with nothing invented.
 *
 * 2. **A written answer (only if a free model is configured).** The retrieved
 *    passages — and nothing else — are handed to the model, which is told to
 *    answer from them alone or admit it cannot.
 *
 * Layer two is grounded in layer one on purpose. An ungrounded model asked
 * "what does this church believe about baptism?" will cheerfully invent
 * something, and a made-up doctrine attributed to a pastor is a real harm, not
 * a glitch. The passages are always displayed next to the answer so nobody has
 * to take the machine's word for it.
 */

/** Words too common to help ranking. Kept short — this is not linguistics. */
const STOP = new Set(
  `a about all also am an and any are as at be been but by can did do does for from get got
   had has have he her here him his how i if in into is it its just like me more most my no
   not now of on one only or other our out over own said say says she so some such than that
   the their them then there these they this those to too us was we were what when where which
   who why will with would you your`.split(/\s+/),
)

function tokenise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
    // Crude suffix trim so "forgiving", "forgiveness" and "forgive" collide.
    // A real stemmer would be better and is not worth a dependency here.
    .map((word) => word.replace(/(ings?|ness|ment|edly|ed|es|s)$/u, ''))
    .filter(Boolean)
}

export type Passage = { index: number; text: string; score: number }

/**
 * Splits a transcript into passages worth quoting.
 *
 * Paragraphs first; anything very long is cut on sentence boundaries so a
 * quoted extract stays readable, and very short fragments are glued to the one
 * before rather than shown alone.
 */
export function splitPassages(transcript: string, target = 900): string[] {
  const paragraphs = transcript
    .split(/\n\s*\n/)
    .map((block) => block.trim().replace(/\s+/g, ' '))
    .filter(Boolean)

  const out: string[] = []

  for (const paragraph of paragraphs) {
    if (paragraph.length <= target) {
      // Stitch stray one-liners onto the previous passage.
      const previous = out.at(-1)
      if (paragraph.length < 120 && previous && previous.length + paragraph.length < target) {
        out[out.length - 1] = `${previous} ${paragraph}`
      } else {
        out.push(paragraph)
      }
      continue
    }

    let current = ''
    for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
      if (current.length + sentence.length > target && current) {
        out.push(current.trim())
        current = ''
      }
      current += `${sentence} `
    }
    if (current.trim()) out.push(current.trim())
  }

  return out
}

/**
 * BM25 over the passages.
 *
 * Chosen over a plain keyword count because it does the two things that matter
 * here for free: it discounts words that appear all over the sermon (every
 * passage says "God"), and it stops a long rambling paragraph from outranking a
 * short precise one.
 */
export function rankPassages(passages: string[], question: string, take = 3): Passage[] {
  const query = tokenise(question)
  if (query.length === 0 || passages.length === 0) return []

  const docs = passages.map(tokenise)
  const lengths = docs.map((doc) => doc.length)
  const averageLength = lengths.reduce((sum, n) => sum + n, 0) / docs.length || 1

  // How many passages contain each query term.
  const containing = new Map<string, number>()
  for (const term of new Set(query)) {
    containing.set(term, docs.filter((doc) => doc.includes(term)).length)
  }

  const k1 = 1.5
  const b = 0.75

  const scored = docs.map((doc, index) => {
    const counts = new Map<string, number>()
    for (const word of doc) counts.set(word, (counts.get(word) ?? 0) + 1)

    let score = 0
    for (const term of new Set(query)) {
      const frequency = counts.get(term) ?? 0
      if (frequency === 0) continue

      const n = containing.get(term) ?? 0
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5))
      const norm = frequency * (k1 + 1)
      const denom = frequency + k1 * (1 - b + (b * lengths[index]!) / averageLength)
      score += idf * (norm / denom)
    }

    return { index, text: passages[index]!, score }
  })

  return scored
    .filter((passage) => passage.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, take)
}

/** Collapses a question so trivial rewordings hit the same cache row. */
export function normaliseQuestion(question: string) {
  return question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300)
}

/**
 * The instruction that keeps the model honest.
 *
 * Every clause here is doing work. "Only from the extracts" is what stops
 * invented doctrine; "say you cannot find it" gives it a way out that is not
 * guessing; and the plain-language rule matches the rest of this site, which is
 * written to be read aloud by a ten-year-old.
 */
const SYSTEM = `You are helping somebody understand a sermon preached at a church.

Rules, in order of importance:
1. Answer ONLY from the sermon extracts provided. Never add outside knowledge, theology, or Bible interpretation of your own.
2. If the extracts do not answer the question, say exactly: "The preacher does not seem to cover that in this sermon." Then suggest what the sermon does talk about. Do not guess.
3. Never invent a quotation. If you quote, quote word for word from the extracts.
4. Write plainly and warmly, in British English, in at most three short paragraphs. A ten-year-old should follow it.
5. Do not give personal, medical, legal or financial advice. If the question needs a person rather than a summary, say so and suggest speaking to a pastor.`

export type SermonAnswer = {
  /** The written answer, when a model was available. */
  answer: string | null
  /** Always present — these are the sermon's own words. */
  passages: Passage[]
  provider: AiProvider | null
  /** Why there is no written answer, for an honest message on screen. */
  fallback: 'not-configured' | 'failed' | 'timeout' | 'no-match' | null
}

/**
 * Answers a question about one sermon.
 *
 * `markPublic` is called here and nowhere else in the codebase: the transcript
 * of a PUBLISHED sermon is already on the open website, so sending an extract
 * of it to a free model discloses nothing new. The caller must have checked the
 * sermon is published — see the route.
 */
export async function answerFromSermon({
  transcript,
  question,
}: {
  transcript: string
  question: string
}): Promise<SermonAnswer> {
  const passages = rankPassages(splitPassages(transcript), question)

  if (passages.length === 0) {
    return { answer: null, passages: [], provider: null, fallback: 'no-match' }
  }

  const context = markPublic(
    passages.map((passage, position) => `[${position + 1}] ${passage.text}`).join('\n\n'),
    'published sermon transcript — preached publicly and on the public website',
  )

  const result = await askGrounded({ question, context, system: SYSTEM })

  return result.ok
    ? { answer: result.text.trim(), passages, provider: result.provider, fallback: null }
    : { answer: null, passages, provider: null, fallback: result.reason }
}
