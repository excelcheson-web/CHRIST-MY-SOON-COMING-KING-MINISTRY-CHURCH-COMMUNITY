'use client'

import { Check, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

export type AdminTestimonyRow = {
  id: string
  title: string
  content: string
  category: string
  status: string
  isFeatured: boolean
  anonymous: boolean
  authorName: string
  contactEmail: string | null
  createdAt: string
}

const statusStyles: Record<string, string> = {
  PENDING: 'bg-accent-soft text-accent-ink',
  APPROVED: 'bg-success/15 text-success',
  REJECTED: 'bg-destructive/12 text-destructive',
}

export function TestimonyRow({ testimony }: { testimony: AdminTestimonyRow }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  async function call(method: 'PATCH' | 'DELETE', body?: object) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/testimonies/${testimony.id}`, {
        method,
        ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
      })
      const result = (await response.json()) as ApiResult
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
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
              statusStyles[testimony.status],
            )}
          >
            {testimony.status}
          </span>
          <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
            {testimony.category}
          </span>
          {testimony.isFeatured && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent-gradient px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
              <Sparkles className="size-3" aria-hidden />
              Featured
            </span>
          )}
        </div>

        <time dateTime={testimony.createdAt} className="shrink-0 text-sm text-muted-foreground">
          {new Date(testimony.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </time>
      </div>

      <h3 className="mt-4 font-display text-xl font-bold text-foreground">{testimony.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {testimony.authorName}
        {testimony.anonymous && ' · will be published anonymously'}
        {testimony.contactEmail && ` · ${testimony.contactEmail}`}
      </p>

      <p className="mt-4 whitespace-pre-line text-pretty leading-relaxed text-foreground/90">
        {testimony.content}
      </p>

      <div className="mt-6 space-y-4 border-t border-border pt-5">
        <div className="flex flex-wrap gap-2">
          {testimony.status !== 'APPROVED' && (
            <Button size="sm" disabled={busy} onClick={() => call('PATCH', { status: 'APPROVED' })}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              Approve and publish
            </Button>
          )}

          {testimony.status === 'APPROVED' && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => call('PATCH', { isFeatured: !testimony.isFeatured })}
              >
                <Sparkles className="size-4" aria-hidden />
                {testimony.isFeatured ? 'Remove from featured' : 'Feature on the homepage'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => call('PATCH', { status: 'PENDING' })}
              >
                Unpublish
              </Button>
            </>
          )}

          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (confirm(`Delete "${testimony.title}"? This cannot be undone.`)) {
                void call('DELETE')
              }
            }}
          >
            <Trash2 className="size-4 text-destructive" aria-hidden />
            Delete
          </Button>
        </div>

        {testimony.status === 'PENDING' && (
          <div>
            <label
              htmlFor={`reject-${testimony.id}`}
              className="mb-1.5 block font-display text-sm font-semibold text-foreground"
            >
              Reason for not publishing (kept internal)
            </label>
            <input
              id={`reject-${testimony.id}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="h-12 w-full rounded-xl border-2 border-input bg-card px-3 text-base"
            />
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              disabled={busy}
              onClick={() => call('PATCH', { status: 'REJECTED', rejectReason: reason })}
            >
              <X className="size-4" aria-hidden />
              Do not publish
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
