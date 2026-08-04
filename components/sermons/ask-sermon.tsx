'use client'

import { Loader2, Quote, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import type { ApiResult } from '@/types'

type AskResponse = {
  answer: string | null
  passages: string[]
  cached: boolean
  provider: string | null
  fallback: 'not-configured' | 'failed' | 'timeout' | 'no-match' | null
}

/**
 * "Ask this sermon."
 *
 * Works with or without AI. Without it, the person gets the passages of the
 * sermon that match their question — which is a real answer in the preacher's
 * own words. With it, they get a short written summary **above** those same
 * passages, never instead of them, so the source is always one glance away.
 */
export function AskSermon({ slug, suggestions }: { slug: string; suggestions: string[] }) {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<AskResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function ask(text: string) {
    const asked = text.trim()
    if (asked.length < 4) return

    setBusy(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(`/api/sermons/${slug}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: asked }),
      })
      const payload = (await response.json()) as ApiResult<AskResponse>

      if (!response.ok || !payload.ok) {
        setError(payload.ok ? 'Something went wrong.' : payload.error)
        return
      }
      setResult(payload.data)
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="ask-heading" className="mt-12">
      <h2 id="ask-heading" className="flex items-center gap-2 text-2xl sm:text-3xl">
        <Search className="size-6 text-primary" aria-hidden />
        Ask this sermon
      </h2>
      <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
        Type a question and we will find the part of the sermon that answers it — in the
        preacher&rsquo;s own words.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void ask(question)
        }}
        className="mt-6 flex flex-wrap gap-3"
      >
        <label className="flex-1 basis-64">
          <span className="sr-only">Your question about this sermon</span>
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            maxLength={300}
            placeholder="What did he say about forgiveness?"
            className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
          />
        </label>
        <button
          type="submit"
          disabled={busy || question.trim().length < 4}
          className="flex min-h-14 items-center gap-2 rounded-xl bg-primary px-7 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          Ask
        </button>
      </form>

      {suggestions.length > 0 && !result && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => {
                  setQuestion(suggestion)
                  void ask(suggestion)
                }}
                className="flex min-h-10 items-center rounded-lg border-2 border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {result && (
        <div className="mt-8" aria-live="polite">
          {result.answer && (
            <div className="rounded-3xl border-2 border-accent/25 bg-accent-soft/50 p-6 sm:p-7">
              <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-accent-ink">
                <Sparkles className="size-4" aria-hidden />
                A short answer
              </p>
              <div className="mt-3 space-y-3 text-pretty leading-relaxed text-foreground">
                {result.answer.split(/\n{2,}/).map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
              {/*
                Said plainly rather than buried in a tooltip. A summary of a
                sermon is not the sermon, and the extracts below are the thing
                that is actually true.
              */}
              <p className="mt-4 border-t border-accent/20 pt-3 text-sm text-muted-foreground">
                Written by a computer from the extracts below. It can get things wrong — the
                preacher&rsquo;s own words are underneath, and they are the ones that count.
              </p>
            </div>
          )}

          {result.fallback === 'no-match' ? (
            <p className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center text-pretty text-muted-foreground">
              Nothing in this sermon seems to touch on that. Try different words, or have a look
              at the sermon notes above.
            </p>
          ) : (
            <>
              <h3 className="mt-8 flex items-center gap-2 font-display text-lg font-bold text-foreground">
                <Quote className="size-5 text-primary" aria-hidden />
                From the sermon
              </h3>
              <ul className="mt-4 space-y-4">
                {result.passages.map((passage) => (
                  <li
                    key={passage.slice(0, 60)}
                    className="rounded-2xl border-l-4 border-primary/40 bg-secondary/40 p-5"
                  >
                    <p className="text-pretty leading-relaxed text-foreground">{passage}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!result.answer && result.fallback !== 'no-match' && (
            <p className="mt-5 text-sm text-muted-foreground">
              {result.fallback === 'not-configured'
                ? 'These are the parts of the sermon that match your question.'
                : 'We could not write a summary just now, so here are the matching parts of the sermon.'}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
