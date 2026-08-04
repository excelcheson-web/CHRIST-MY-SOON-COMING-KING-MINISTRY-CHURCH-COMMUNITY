'use client'

import { CheckCircle2, Loader2, MessageCircleHeart, Send } from 'lucide-react'
import { useState } from 'react'

import { PrayButton } from '@/components/prayer/pray-button'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

export type WallCardData = {
  id: string
  title: string
  content: string
  category: string
  urgency: string
  status: string
  authorName: string
  verse: string | null
  prayerCount: number
  responseCount: number
  answerNote: string | null
  createdAt: string
  isMine: boolean
  hasPrayed: boolean
}

type ResponseCard = { id: string; authorName: string; content: string; createdAt: string; isPrivate: boolean }

const categoryEmoji: Record<string, string> = {
  SALVATION: '❤️',
  HEALING: '🩹',
  FINANCES: '🌾',
  FAMILY: '👨‍👩‍👧',
  RELATIONSHIPS: '🤝',
  GUIDANCE: '🧭',
  THANKSGIVING: '🎉',
  GENERAL: '🙏',
}

const categoryLabels: Record<string, string> = {
  SALVATION: 'Salvation',
  HEALING: 'Healing',
  FINANCES: 'Finances',
  FAMILY: 'Family',
  RELATIONSHIPS: 'Relationships',
  GUIDANCE: 'Guidance',
  THANKSGIVING: 'Thanksgiving',
  GENERAL: 'General',
}

const urgencyStyles: Record<string, string> = {
  URGENT: 'bg-destructive/12 text-destructive',
  HIGH: 'bg-accent-soft text-accent-ink',
}

const urgencyLabels: Record<string, string> = { URGENT: 'Very urgent', HIGH: 'Urgent' }

const TRUNCATE_AT = 260

export function RequestCard({ request }: { request: WallCardData }) {
  const [expanded, setExpanded] = useState(false)
  const [showEncourage, setShowEncourage] = useState(false)
  const [responses, setResponses] = useState<ResponseCard[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [count, setCount] = useState(request.responseCount)

  const isLong = request.content.length > TRUNCATE_AT
  const shown = expanded || !isLong ? request.content : `${request.content.slice(0, TRUNCATE_AT).trimEnd()}…`
  const answered = request.status === 'ANSWERED'

  async function loadResponses() {
    if (responses) return
    try {
      const result = (await (
        await fetch(`/api/prayer/requests/${request.id}/responses`)
      ).json()) as ApiResult<ResponseCard[]>
      if (result.ok) setResponses(result.data)
    } catch {
      setResponses([])
    }
  }

  async function submitEncouragement() {
    if (!text.trim()) return
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/prayer/requests/${request.id}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const result = (await response.json()) as ApiResult<ResponseCard>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not send that.' : result.error)
        return
      }

      setResponses((current) => [...(current ?? []), result.data])
      setCount((value) => value + 1)
      setText('')
      setShowEncourage(false)
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        'rounded-3xl border-2 bg-card p-6 shadow-soft transition-colors sm:p-7',
        answered ? 'border-success/35' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            <span aria-hidden>{categoryEmoji[request.category] ?? '🙏'}</span>
            {categoryLabels[request.category] ?? request.category}
          </span>

          {urgencyLabels[request.urgency] && (
            <span
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
                urgencyStyles[request.urgency],
              )}
            >
              {urgencyLabels[request.urgency]}
            </span>
          )}

          {answered && (
            <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-success">
              <CheckCircle2 className="size-3.5" aria-hidden />
              Answered
            </span>
          )}

          {request.isMine && (
            <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Yours
            </span>
          )}
        </div>

        <time
          dateTime={request.createdAt}
          className="shrink-0 text-sm text-muted-foreground"
        >
          {new Date(request.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        </time>
      </div>

      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{request.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">from {request.authorName}</p>

      <p className="mt-4 whitespace-pre-line text-pretty leading-relaxed text-foreground/90">
        {shown}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 min-h-11 font-semibold text-primary underline-offset-4 hover:underline"
        >
          {expanded ? 'Show less' : 'Read the whole request'}
        </button>
      )}

      {request.verse && (
        <blockquote className="mt-5 rounded-r-2xl border-l-4 border-accent bg-accent-soft/60 py-4 pl-5 pr-4">
          <p className="font-display italic text-foreground">{request.verse}</p>
        </blockquote>
      )}

      {answered && request.answerNote && (
        <div className="mt-5 rounded-2xl border-2 border-success/30 bg-success/10 p-5">
          <p className="flex items-center gap-2 font-display font-bold text-success">
            <CheckCircle2 className="size-5" aria-hidden />
            How God answered
          </p>
          <p className="mt-2 whitespace-pre-line text-pretty text-foreground/90">{request.answerNote}</p>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <PrayButton
          requestId={request.id}
          initialCount={request.prayerCount}
          initialPrayed={request.hasPrayed}
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowEncourage((value) => !value)
              void loadResponses()
            }}
            aria-expanded={showEncourage}
          >
            <MessageCircleHeart aria-hidden className="size-4" />
            {count === 0 ? 'Leave an encouragement' : `Encouragements (${count})`}
          </Button>
        </div>

        {showEncourage && (
          <div className="mt-5 space-y-4">
            {error && <Alert variant="error">{error}</Alert>}

            {responses === null ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </p>
            ) : (
              responses.length > 0 && (
                <ul className="space-y-3">
                  {responses.map((response) => (
                    <li key={response.id} className="rounded-2xl bg-secondary/50 p-4">
                      <p className="text-pretty text-foreground/90">{response.content}</p>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        — {response.authorName}
                        {response.isPrivate && ' · private note'}
                      </p>
                    </li>
                  ))}
                </ul>
              )
            )}

            <div>
              <label htmlFor={`encourage-${request.id}`} className="sr-only">
                Write an encouragement for {request.title}
              </label>
              <textarea
                id={`encourage-${request.id}`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={200}
                rows={3}
                placeholder="A short word or a verse…"
                className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{200 - text.length} characters left</p>
                <Button size="sm" onClick={submitEncouragement} disabled={busy || !text.trim()}>
                  {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send aria-hidden className="size-4" />}
                  Send encouragement
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
