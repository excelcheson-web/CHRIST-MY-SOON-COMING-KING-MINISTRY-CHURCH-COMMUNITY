'use client'

import { Loader2, Lock, Mail } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { timeAgo } from '@/lib/community-display'
import { careKindLabels, careStatusLabels } from '@/lib/community-labels'
import { careStatuses } from '@/lib/validations'
import { cn } from '@/lib/utils'
import type { CareKind, CareStatus } from '@prisma/client'

export type CareItem = {
  id: string
  kind: CareKind
  subject: string
  body: string
  status: CareStatus
  createdAt: string
  response: string | null
  replyToEmail: string | null
  authorName: string | null
}

const statusStyles: Record<CareStatus, string> = {
  OPEN: 'bg-destructive/12 text-destructive',
  IN_PROGRESS: 'bg-accent-soft text-accent-ink',
  ANSWERED: 'bg-success/15 text-success',
  CLOSED: 'bg-secondary text-muted-foreground',
}

export function CareRow({ item }: { item: CareItem }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [response, setResponse] = useState(item.response ?? '')
  const [open, setOpen] = useState(false)

  async function save(status: CareStatus) {
    setBusy(true)
    try {
      await fetch(`/api/community/care?id=${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, response: response.trim() || undefined }),
      })
      router.refresh()
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        'rounded-3xl border-2 bg-card p-6 shadow-soft',
        item.kind === 'BENEVOLENCE' ? 'border-accent/35' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider',
            statusStyles[item.status],
          )}
        >
          {careStatusLabels[item.status]}
        </span>
        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          {careKindLabels[item.kind]}
        </span>
        {!item.authorName && (
          <span className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            Anonymous
          </span>
        )}
      </div>

      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{item.subject}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {item.authorName ?? 'Name withheld'} · {timeAgo(item.createdAt)}
      </p>

      <p className="mt-4 whitespace-pre-wrap text-pretty rounded-2xl bg-secondary/50 p-4 text-foreground">
        {item.body}
      </p>

      {item.replyToEmail && (
        <p className="mt-3 flex items-center gap-2 text-sm">
          <Mail className="size-4 text-primary" aria-hidden />
          <a
            href={`mailto:${item.replyToEmail}?subject=${encodeURIComponent(`Re: ${item.subject}`)}`}
            className="font-semibold text-primary hover:underline"
          >
            {item.replyToEmail}
          </a>
        </p>
      )}

      {item.response && (
        <div className="mt-4 rounded-2xl border-2 border-success/25 bg-success/5 p-4">
          <p className="font-display text-sm font-bold uppercase tracking-wider text-success">
            Our reply
          </p>
          <p className="mt-2 whitespace-pre-wrap text-pretty text-foreground">{item.response}</p>
        </div>
      )}

      {open ? (
        <div className="mt-5 border-t border-border pt-4">
          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">
              Note or reply
            </span>
            <textarea
              value={response}
              onChange={(event) => setResponse(event.target.value)}
              rows={4}
              maxLength={5000}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {careStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => save(status)}
                disabled={busy}
                className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary/25 px-4 font-semibold text-primary transition-colors hover:bg-primary-soft disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Mark {careStatusLabels[status].toLowerCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-xl px-4 font-semibold text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 flex min-h-11 items-center rounded-xl bg-primary px-5 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Respond
        </button>
      )}
    </article>
  )
}
