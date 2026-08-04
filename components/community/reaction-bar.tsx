'use client'

import { useState } from 'react'

import {
  reactionEmoji,
  reactionLabels,
  reactionOrder,
  sortTally,
  totalReactions,
  type ReactionTally,
} from '@/lib/reactions'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'
import type { ReactionType } from '@prisma/client'

/**
 * The five ways to respond to a post.
 *
 * "Praying" leads deliberately — on a church feed it is the one people reach
 * for most, and it says something a plain like cannot.
 *
 * The picker only opens on demand: five buttons under every post in a long
 * feed is visual noise, and the tally is what most people want to see.
 */
export function ReactionBar({
  postId,
  mine,
  tally,
  signedIn,
  onSignInNeeded,
}: {
  postId: string
  mine: ReactionType | null
  tally: ReactionTally[]
  signedIn: boolean
  onSignInNeeded: () => void
}) {
  const [current, setCurrent] = useState<ReactionType | null>(mine)
  const [counts, setCounts] = useState<ReactionTally[]>(tally)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const total = totalReactions(counts)
  const summary = sortTally(counts)

  async function react(type: ReactionType) {
    if (!signedIn) {
      onSignInNeeded()
      return
    }

    setOpen(false)
    setBusy(true)

    // Optimistic: pressing the one you already have clears it.
    const next = current === type ? null : type
    const previous = { current, counts }
    setCurrent(next)
    setCounts((rows) => {
      const map = new Map(rows.map((row) => [row.type, row.count]))
      if (previous.current) map.set(previous.current, Math.max(0, (map.get(previous.current) ?? 1) - 1))
      if (next) map.set(next, (map.get(next) ?? 0) + 1)
      return [...map].map(([t, count]) => ({ type: t, count }))
    })

    try {
      const response = await fetch(`/api/community/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: next }),
      })
      const result = (await response.json()) as ApiResult<{
        myReaction: ReactionType | null
        reactions: ReactionTally[]
      }>

      if (result.ok) {
        // The server's numbers win — somebody else may have reacted meanwhile.
        setCurrent(result.data.myReaction)
        setCounts(result.data.reactions)
      } else {
        setCurrent(previous.current)
        setCounts(previous.counts)
      }
    } catch {
      setCurrent(previous.current)
      setCounts(previous.counts)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => (signedIn ? setOpen((value) => !value) : onSignInNeeded())}
        aria-expanded={open}
        aria-haspopup="true"
        disabled={busy}
        className={cn(
          'flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold transition-colors disabled:opacity-60',
          current
            ? 'bg-accent-soft text-accent-ink'
            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
        )}
      >
        <span aria-hidden className="text-lg leading-none">
          {current ? reactionEmoji[current] : '🙏'}
        </span>
        <span>{current ? reactionLabels[current].split(' ')[0] : 'React'}</span>
      </button>

      {open && (
        <>
          {/* Click-away. Not focusable — Escape and the toggle both close it. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="menu"
            onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
            className="absolute bottom-full left-0 z-20 mb-2 flex gap-1 rounded-2xl border-2 border-border bg-card p-2 shadow-lifted"
          >
            {reactionOrder.map((type) => (
              <button
                key={type}
                type="button"
                role="menuitem"
                onClick={() => react(type)}
                title={reactionLabels[type]}
                className={cn(
                  'grid size-12 place-items-center rounded-xl text-2xl transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:hover:scale-100',
                  current === type && 'bg-accent-soft',
                )}
              >
                <span aria-hidden>{reactionEmoji[type]}</span>
                <span className="sr-only">{reactionLabels[type]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {total > 0 && (
        <p className="flex items-center gap-1 text-sm text-muted-foreground">
          <span aria-hidden>
            {summary.slice(0, 3).map((row) => reactionEmoji[row.type]).join('')}
          </span>
          <span className="sr-only">
            {summary.map((row) => `${row.count} ${reactionLabels[row.type]}`).join(', ')}
          </span>
          <span aria-hidden>{total}</span>
        </p>
      )}
    </div>
  )
}
