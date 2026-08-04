'use client'

import { AlertTriangle, Flag, HandHeart, Loader2, Lock, Send, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

export type AdminPrayerRow = {
  id: string
  title: string
  content: string
  category: string
  urgency: string
  visibility: string
  status: string
  anonymous: boolean
  authorName: string
  contactEmail: string | null
  prayerCount: number
  responseCount: number
  answerNote: string | null
  flagged: boolean
  needsPastoralFollowUp: boolean
  createdAt: string
  hasPrayed: boolean
}

const urgencyStyles: Record<string, string> = {
  URGENT: 'bg-destructive/12 text-destructive',
  HIGH: 'bg-accent-soft text-accent-ink',
  NORMAL: 'bg-secondary text-muted-foreground',
  LOW: 'bg-secondary text-muted-foreground',
}

export function PrayerRow({ request }: { request: AdminPrayerRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [answerNote, setAnswerNote] = useState(request.answerNote ?? '')
  const [note, setNote] = useState('')
  const [prayed, setPrayed] = useState(request.hasPrayed)
  const [count, setCount] = useState(request.prayerCount)

  async function call(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: object) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(url, {
        method,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      })
      const result = (await response.json()) as ApiResult
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('We could not reach the server. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function logPrayer() {
    if (prayed) return
    setPrayed(true)
    setCount((value) => value + 1)
    const ok = await call(`/api/prayer/requests/${request.id}/pray`, 'POST')
    if (!ok) {
      setPrayed(false)
      setCount((value) => Math.max(0, value - 1))
    }
  }

  const isPrivate = request.visibility === 'PRIVATE'

  return (
    <article
      className={cn(
        'rounded-3xl border-2 bg-card p-6 shadow-soft',
        request.flagged
          ? 'border-destructive/40'
          : request.needsPastoralFollowUp
            ? 'border-accent/50'
            : 'border-border',
      )}
    >
      {error && (
        <Alert variant="error" className="mb-5">
          {error}
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
              urgencyStyles[request.urgency],
            )}
          >
            {request.urgency}
          </span>
          <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            {request.category}
          </span>
          {isPrivate && (
            <span className="flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Lock className="size-3" aria-hidden />
              Private
            </span>
          )}
          {request.status === 'ANSWERED' && (
            <span className="rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-success">
              Answered
            </span>
          )}
          {request.needsPastoralFollowUp && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              <AlertTriangle className="size-3" aria-hidden />
              Pastor needed
            </span>
          )}
          {request.flagged && (
            <span className="flex items-center gap-1.5 rounded-full bg-destructive/12 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive">
              <Flag className="size-3" aria-hidden />
              Flagged
            </span>
          )}
        </div>

        <time dateTime={request.createdAt} className="shrink-0 text-sm text-muted-foreground">
          {new Date(request.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
      </div>

      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{request.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {request.authorName}
        {request.anonymous && ' · asked to stay anonymous'}
        {request.contactEmail && ` · ${request.contactEmail}`}
      </p>

      <p className="mt-4 whitespace-pre-line text-pretty leading-relaxed text-foreground/90">
        {request.content}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button onClick={logPrayer} disabled={prayed || busy} variant={prayed ? 'outline' : 'default'} size="sm">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <HandHeart className="size-4" aria-hidden />}
          {prayed ? 'You prayed' : 'I prayed for this'}
        </Button>
        <p className="text-sm text-muted-foreground">
          {count} prayed · {request.responseCount} encouragements
        </p>
      </div>

      <div className="mt-6 space-y-5 border-t border-border pt-5">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              call(`/api/prayer/requests/${request.id}`, 'PATCH', {
                needsPastoralFollowUp: !request.needsPastoralFollowUp,
              })
            }
          >
            <AlertTriangle className="size-4" aria-hidden />
            {request.needsPastoralFollowUp ? 'Clear pastoral flag' : 'Needs a pastor'}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              call(`/api/prayer/requests/${request.id}`, 'PATCH', { flagged: !request.flagged })
            }
          >
            <Flag className="size-4" aria-hidden />
            {request.flagged ? 'Unflag' : 'Flag as inappropriate'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (confirm(`Delete "${request.title}"? This cannot be undone.`)) {
                void call(`/api/prayer/requests/${request.id}`, 'DELETE')
              }
            }}
          >
            <Trash2 className="size-4 text-destructive" aria-hidden />
            Delete
          </Button>
        </div>

        {/* Marking answered captures the story, not just the state. */}
        <div>
          <label
            htmlFor={`answer-${request.id}`}
            className="mb-1.5 block font-display text-sm font-semibold text-foreground"
          >
            How did God answer? (marks this as answered)
          </label>
          <textarea
            id={`answer-${request.id}`}
            value={answerNote}
            onChange={(event) => setAnswerNote(event.target.value)}
            rows={2}
            className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-base"
            placeholder="Shown on the wall so everyone can rejoice."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={busy || !answerNote.trim()}
              onClick={() =>
                call(`/api/prayer/requests/${request.id}`, 'PATCH', {
                  status: 'ANSWERED',
                  answerNote,
                })
              }
            >
              Mark answered
            </Button>
            {request.status === 'ANSWERED' && (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => call(`/api/prayer/requests/${request.id}`, 'PATCH', { status: 'ACTIVE' })}
              >
                Reopen
              </Button>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor={`note-${request.id}`}
            className="mb-1.5 block font-display text-sm font-semibold text-foreground"
          >
            Private note to the requester
          </label>
          <p className="mb-2 text-sm text-muted-foreground">
            Only they will see this — it never appears in the public thread.
          </p>
          <textarea
            id={`note-${request.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            maxLength={200}
            className="w-full rounded-xl border-2 border-input bg-card px-3 py-2 text-base"
          />
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={busy || !note.trim()}
            onClick={async () => {
              const ok = await call(`/api/prayer/requests/${request.id}/responses`, 'POST', {
                content: note,
                isPrivate: true,
              })
              if (ok) setNote('')
            }}
          >
            <Send className="size-4" aria-hidden />
            Send private encouragement
          </Button>
        </div>
      </div>
    </article>
  )
}
