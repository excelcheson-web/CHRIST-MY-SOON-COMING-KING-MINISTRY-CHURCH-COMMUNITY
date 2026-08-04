'use client'

import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

import type { FeedPoll } from '@/lib/community-display'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

/**
 * A poll inside a feed post.
 *
 * Results stay hidden until you have voted or the poll has closed — seeing the
 * running total first changes the answer, and a church asking "which outreach
 * day suits you?" wants the honest one.
 */
export function PollCard({
  poll,
  signedIn,
  onSignInNeeded,
}: {
  poll: FeedPoll
  signedIn: boolean
  onSignInNeeded: () => void
}) {
  const [options, setOptions] = useState(poll.options)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasVoted = options.some((option) => option.mine)
  const showResults = hasVoted || poll.closed
  const total = options.reduce((sum, option) => sum + option.votes, 0)

  async function vote(optionId: string) {
    if (!signedIn) {
      onSignInNeeded()
      return
    }
    if (poll.closed) return

    const chosen = poll.multiple
      ? options.filter((o) => (o.id === optionId ? !o.mine : o.mine)).map((o) => o.id)
      : [optionId]

    if (chosen.length === 0) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/community/polls?id=${poll.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIds: chosen }),
      })
      const result = (await response.json()) as ApiResult<{ options: typeof options }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }
      setOptions(result.data.options)
    } catch {
      setError('We could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-5 rounded-2xl border-2 border-border bg-secondary/40 p-5">
      <p className="font-display font-bold text-foreground">{poll.question}</p>
      {poll.multiple && !poll.closed && (
        <p className="mt-1 text-sm text-muted-foreground">Choose as many as you like.</p>
      )}

      <ul className="mt-4 space-y-2">
        {options.map((option) => {
          const share = total > 0 ? Math.round((option.votes / total) * 100) : 0

          return (
            <li key={option.id}>
              <button
                type="button"
                onClick={() => vote(option.id)}
                disabled={busy || poll.closed}
                aria-pressed={option.mine}
                className={cn(
                  'relative flex min-h-12 w-full items-center gap-3 overflow-hidden rounded-xl border-2 px-4 text-left font-semibold transition-colors',
                  option.mine
                    ? 'border-primary/40 text-primary'
                    : 'border-border text-foreground hover:border-primary/25',
                  poll.closed && 'cursor-default',
                )}
              >
                {/* The bar sits behind the label rather than beside it, so a
                    long option never squeezes the result off the row. */}
                {showResults && (
                  <span
                    aria-hidden
                    style={{ width: `${share}%` }}
                    className={cn(
                      'absolute inset-y-0 left-0 transition-[width] duration-500',
                      option.mine ? 'bg-primary-soft' : 'bg-secondary',
                    )}
                  />
                )}

                <span className="relative flex flex-1 items-center gap-2">
                  {option.mine && <Check className="size-4 shrink-0" aria-hidden />}
                  {option.label}
                </span>

                {showResults && (
                  <span className="relative shrink-0 text-sm text-muted-foreground">
                    {share}%
                    <span className="sr-only">
                      , {option.votes} {option.votes === 1 ? 'vote' : 'votes'}
                    </span>
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {poll.closed
          ? 'This poll has closed.'
          : showResults
            ? `${total} ${total === 1 ? 'person has' : 'people have'} answered`
            : 'Answer to see how everyone voted'}
      </p>

      {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
    </div>
  )
}
