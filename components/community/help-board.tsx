'use client'

import { Check, HandHeart, Loader2, Plus, Send, X } from 'lucide-react'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { timeAgo } from '@/lib/community-display'
import { helpCategoryEmoji, helpCategoryLabels, helpStatusLabels } from '@/lib/community-labels'
import { helpCategories } from '@/lib/validations'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'
import type { HelpCategory, HelpKind, HelpStatus } from '@prisma/client'

export type HelpItem = {
  id: string
  kind: HelpKind
  category: HelpCategory
  title: string
  body: string
  timeframe: string | null
  area: string | null
  status: HelpStatus
  createdAt: string
  authorId: string
  author: { name: string; image: string | null }
  claimedBy: { id: string; name: string } | null
  replyCount: number
  isMine: boolean
}

const kindTabs = [
  { value: 'REQUEST' as const, label: 'Needs a hand', emoji: '🙋' },
  { value: 'OFFER' as const, label: 'Offering help', emoji: '🤲' },
]

/**
 * "Can someone help me move?" and "I can fix your car" on one board.
 *
 * Both directions live together because they are the same conversation from
 * two ends — a member scanning for a way to serve should see the requests, and
 * somebody stuck should see who has already offered.
 */
export function HelpBoard({
  initial,
  viewerId,
  canModerate,
}: {
  initial: HelpItem[]
  viewerId: string
  canModerate: boolean
}) {
  const [items, setItems] = useState(initial)
  const [kind, setKind] = useState<HelpKind | 'all'>('all')
  const [composing, setComposing] = useState<HelpKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const shown = kind === 'all' ? items : items.filter((item) => item.kind === kind)

  async function refresh() {
    try {
      const response = await fetch('/api/community/help')
      const result = (await response.json()) as ApiResult<HelpItem[]>
      if (result.ok) setItems(result.data)
    } catch {
      // Leave what is on screen.
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!composing) return

    setBusy(true)
    setError(null)
    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/community/help', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: composing,
          category: form.get('category'),
          title: form.get('title'),
          body: form.get('body'),
          timeframe: form.get('timeframe'),
          area: form.get('area'),
        }),
      })
      const result = (await response.json()) as ApiResult<unknown>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setComposing(null)
      await refresh()
    } catch {
      setError('We could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function reply(postId: string) {
    const text = replyBody.trim()
    if (!text) return

    setBusy(true)
    try {
      await fetch(`/api/community/help/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text }),
      })
      setReplyBody('')
      setReplyTo(null)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(postId: string, status: HelpStatus) {
    setBusy(true)
    try {
      await fetch(`/api/community/help/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav aria-label="Filter the board">
          <ul className="flex flex-wrap gap-2">
            <li>
              <button
                type="button"
                onClick={() => setKind('all')}
                aria-pressed={kind === 'all'}
                className={tab(kind === 'all')}
              >
                Everything
              </button>
            </li>
            {kindTabs.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => setKind(item.value)}
                  aria-pressed={kind === item.value}
                  className={tab(kind === item.value)}
                >
                  <span aria-hidden>{item.emoji}</span> {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setComposing(composing === 'REQUEST' ? null : 'REQUEST')}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-5" aria-hidden />
            Ask for help
          </button>
          <button
            type="button"
            onClick={() => setComposing(composing === 'OFFER' ? null : 'OFFER')}
            className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-primary/25 px-5 font-display font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            <HandHeart className="size-5" aria-hidden />
            Offer help
          </button>
        </div>
      </div>

      {composing && (
        <form
          onSubmit={create}
          className="mt-6 space-y-5 rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7"
        >
          <h2 className="text-xl">
            {composing === 'REQUEST' ? 'What do you need a hand with?' : 'What can you offer?'}
          </h2>

          {error && <Alert variant="error">{error}</Alert>}

          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">Title</span>
            <Input
              name="title"
              required
              maxLength={140}
              placeholder={
                composing === 'REQUEST'
                  ? 'Need a lift to the Sunday service'
                  : 'Happy to do basic car repairs'
              }
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">Details</span>
            <textarea
              name="body"
              rows={4}
              required
              maxLength={3000}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">Kind</span>
              <select
                name="category"
                className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
              >
                {helpCategories.map((category) => (
                  <option key={category} value={category}>
                    {helpCategoryEmoji[category]} {helpCategoryLabels[category]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">When</span>
              <Input name="timeframe" maxLength={120} placeholder="Saturday morning" />
            </label>

            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">Area</span>
              <Input name="area" maxLength={80} placeholder="East Side" />
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
              Post it
            </button>
            <button
              type="button"
              onClick={() => setComposing(null)}
              className="flex min-h-12 items-center rounded-xl border-2 border-border px-5 font-semibold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {shown.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center text-pretty text-muted-foreground">
          Nothing on the board right now. If you need a hand, ask — that is what this is for.
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 lg:grid-cols-2">
          {shown.map((item) => (
            <li key={item.id}>
              <article
                className={cn(
                  'flex h-full flex-col rounded-3xl border-2 bg-card p-6 shadow-soft',
                  item.status === 'CLAIMED' ? 'border-success/35' : 'border-border',
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                      item.kind === 'REQUEST'
                        ? 'bg-primary-soft text-primary'
                        : 'bg-accent-soft text-accent-ink',
                    )}
                  >
                    {item.kind === 'REQUEST' ? '🙋 Needs a hand' : '🤲 Offering'}
                  </span>
                  <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                    {helpCategoryEmoji[item.category]} {helpCategoryLabels[item.category]}
                  </span>
                  {item.status !== 'OPEN' && (
                    <span className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-success">
                      {helpStatusLabels[item.status]}
                    </span>
                  )}
                </div>

                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-pretty text-muted-foreground">
                  {item.body}
                </p>

                <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <div>
                    <dt className="inline font-semibold">From: </dt>
                    <dd className="inline">{item.author.name}</dd>
                  </div>
                  {item.timeframe && (
                    <div>
                      <dt className="inline font-semibold">When: </dt>
                      <dd className="inline">{item.timeframe}</dd>
                    </div>
                  )}
                  {item.area && (
                    <div>
                      <dt className="inline font-semibold">Area: </dt>
                      <dd className="inline">{item.area}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="sr-only">Posted</dt>
                    <dd>{timeAgo(item.createdAt)}</dd>
                  </div>
                </dl>

                {item.claimedBy && (
                  <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-success">
                    <Check className="size-4" aria-hidden />
                    {item.claimedBy.id === viewerId ? 'You' : item.claimedBy.name} stepped up
                  </p>
                )}

                <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                  {replyTo === item.id ? (
                    <div className="w-full">
                      <textarea
                        value={replyBody}
                        onChange={(event) => setReplyBody(event.target.value)}
                        rows={2}
                        placeholder={
                          item.kind === 'REQUEST' ? 'I can help with this…' : 'Yes please —…'
                        }
                        className="w-full rounded-xl border-2 border-input bg-card px-4 py-2.5 text-base text-foreground"
                      />
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => reply(item.id)}
                          disabled={busy || !replyBody.trim()}
                          className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          <Send className="size-4" aria-hidden />
                          Send
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplyTo(null)}
                          className="flex min-h-11 items-center gap-1 rounded-xl px-3 font-semibold text-muted-foreground"
                        >
                          <X className="size-4" aria-hidden />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!item.isMine && item.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => setReplyTo(item.id)}
                          className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          <HandHeart className="size-4" aria-hidden />
                          {item.kind === 'REQUEST' ? 'I can help' : 'Yes please'}
                        </button>
                      )}

                      {item.replyCount > 0 && (
                        <span className="flex min-h-11 items-center text-sm font-semibold text-muted-foreground">
                          {item.replyCount} {item.replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                      )}

                      {(item.isMine || canModerate) && item.status !== 'DONE' && (
                        <button
                          type="button"
                          onClick={() => setStatus(item.id, 'DONE')}
                          disabled={busy}
                          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-success/35 px-4 font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-60"
                        >
                          <Check className="size-4" aria-hidden />
                          Sorted
                        </button>
                      )}
                    </>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const tab = (active: boolean) =>
  cn(
    'flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 font-semibold transition-colors',
    active
      ? 'border-primary/35 bg-primary-soft text-primary'
      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
  )
