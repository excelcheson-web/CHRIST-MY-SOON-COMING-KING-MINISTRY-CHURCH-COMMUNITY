'use client'

import { Check, Loader2, RotateCcw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { timeAgo } from '@/lib/community-display'

export type ReportedPost = {
  id: string
  body: string
  authorName: string
  createdAt: string
  removed: boolean
  reports: { id: string; reason: string; reportedBy: string; createdAt: string }[]
}

export function ModerationRow({ post }: { post: ReportedPost }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function act(action: 'remove' | 'restore' | 'dismiss') {
    setBusy(action)
    try {
      await fetch(`/api/community/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function erase() {
    if (!confirm('Delete this post for good? This cannot be undone.')) return
    setBusy('delete')
    try {
      await fetch(`/api/community/posts/${post.id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  const spinner = (key: string) =>
    busy === key ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null

  return (
    <article className="rounded-3xl border-2 border-destructive/30 bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display font-bold text-foreground">
          {post.authorName}
          <span className="ml-2 font-sans text-sm font-normal text-muted-foreground">
            {timeAgo(post.createdAt)}
          </span>
        </p>
        {post.removed && (
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Already removed
          </span>
        )}
      </div>

      <blockquote className="mt-4 whitespace-pre-wrap text-pretty rounded-2xl bg-secondary/50 p-4 text-foreground">
        {post.body}
      </blockquote>

      <div className="mt-5">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-destructive">
          {post.reports.length} {post.reports.length === 1 ? 'report' : 'reports'}
        </h3>
        <ul className="mt-3 space-y-2">
          {post.reports.map((report) => (
            <li key={report.id} className="text-sm">
              <span className="font-semibold text-foreground">{report.reportedBy}</span>
              <span className="text-muted-foreground"> · {timeAgo(report.createdAt)}</span>
              <p className="mt-0.5 text-pretty text-muted-foreground">{report.reason}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
        {post.removed ? (
          <button
            type="button"
            onClick={() => act('restore')}
            disabled={Boolean(busy)}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {spinner('restore') ?? <RotateCcw className="size-4" aria-hidden />}
            Put it back
          </button>
        ) : (
          <button
            type="button"
            onClick={() => act('remove')}
            disabled={Boolean(busy)}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-destructive px-4 font-semibold text-destructive-foreground transition-colors hover:brightness-110 disabled:opacity-60"
          >
            {spinner('remove') ?? <Trash2 className="size-4" aria-hidden />}
            Remove it
          </button>
        )}

        <button
          type="button"
          onClick={() => act('dismiss')}
          disabled={Boolean(busy)}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-success/35 px-4 font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-60"
        >
          {spinner('dismiss') ?? <Check className="size-4" aria-hidden />}
          This one is fine
        </button>

        <span className="flex-1" />

        <button
          type="button"
          onClick={erase}
          disabled={Boolean(busy)}
          className="flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
        >
          {spinner('delete')}
          Delete for good
        </button>
      </div>
    </article>
  )
}
