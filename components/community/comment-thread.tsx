'use client'

import { Loader2, Send, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { timeAgo, type FeedComment } from '@/lib/community-display'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

/**
 * Replies under a post.
 *
 * Loaded only when someone opens the thread — a feed of thirty posts should not
 * fetch thirty conversations nobody asked to read.
 */
export function CommentThread({
  postId,
  signedIn,
  onCountChange,
}: {
  postId: string
  signedIn: boolean
  onCountChange: (delta: number) => void
}) {
  const [comments, setComments] = useState<FeedComment[] | null>(null)
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/community/posts/${postId}/comments`)
      .then((response) => response.json() as Promise<ApiResult<FeedComment[]>>)
      .then((result) => {
        if (!cancelled) setComments(result.ok ? result.data : [])
      })
      .catch(() => {
        if (!cancelled) setComments([])
      })

    return () => {
      cancelled = true
    }
  }, [postId])

  async function send() {
    const text = body.trim()
    if (!text) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: text, parentId: replyTo?.id }),
      })
      const result = (await response.json()) as ApiResult<FeedComment>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setComments((current) => [...(current ?? []), result.data])
      onCountChange(1)
      setBody('')
      setReplyTo(null)
    } catch {
      setError('We could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(comment: FeedComment) {
    if (!confirm('Remove this reply?')) return

    try {
      const response = await fetch(
        `/api/community/posts/${postId}/comments?commentId=${comment.id}`,
        { method: 'DELETE' },
      )
      if (!response.ok) return

      // Removing a parent takes its replies with it, exactly as the server does.
      setComments((current) =>
        (current ?? []).filter((row) => row.id !== comment.id && row.parentId !== comment.id),
      )
      const removed =
        1 + (comments ?? []).filter((row) => row.parentId === comment.id).length
      onCountChange(-removed)
    } catch {
      // A failed delete leaves the reply on screen, which is the honest result.
    }
  }

  const roots = (comments ?? []).filter((row) => !row.parentId)
  const repliesOf = (id: string) => (comments ?? []).filter((row) => row.parentId === id)

  return (
    <div className="mt-5 border-t border-border pt-5">
      {comments === null ? (
        <p className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading replies…
        </p>
      ) : roots.length === 0 ? (
        <p className="text-muted-foreground">No replies yet. Be the first to say something kind.</p>
      ) : (
        <ul className="space-y-4">
          {roots.map((comment) => (
            <li key={comment.id}>
              <Comment comment={comment} onReply={setReplyTo} onRemove={remove} />

              {repliesOf(comment.id).length > 0 && (
                <ul className="mt-3 space-y-3 border-l-2 border-border pl-4 sm:pl-6">
                  {repliesOf(comment.id).map((reply) => (
                    <li key={reply.id}>
                      <Comment comment={reply} onReply={setReplyTo} onRemove={remove} nested />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      {signedIn ? (
        <div className="mt-5">
          {replyTo && (
            <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              Replying to <span className="font-semibold text-foreground">{replyTo.authorName}</span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="font-semibold text-primary hover:underline"
              >
                cancel
              </button>
            </p>
          )}

          <div className="flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Write a reply</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Say something encouraging…"
                className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
              />
            </label>
            <button
              type="button"
              onClick={send}
              disabled={busy || !body.trim()}
              className="flex min-h-12 shrink-0 items-center gap-2 self-start rounded-xl bg-primary px-5 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-5" aria-hidden />
              )}
              <span className="sr-only sm:not-sr-only">Send</span>
            </button>
          </div>

          {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
        </div>
      ) : (
        <p className="mt-5 text-muted-foreground">
          <a href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </a>{' '}
          to join the conversation.
        </p>
      )}
    </div>
  )
}

function Comment({
  comment,
  onReply,
  onRemove,
  nested,
}: {
  comment: FeedComment
  onReply: (comment: FeedComment) => void
  onRemove: (comment: FeedComment) => void
  nested?: boolean
}) {
  return (
    <div className={cn('rounded-2xl bg-secondary/50 p-4', nested && 'bg-secondary/30')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display font-bold text-foreground">{comment.authorName}</p>
        <time dateTime={comment.createdAt} className="text-sm text-muted-foreground">
          {timeAgo(comment.createdAt)}
        </time>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-pretty text-foreground">{comment.body}</p>

      <div className="mt-3 flex gap-4 text-sm">
        {!nested && (
          <button
            type="button"
            onClick={() => onReply(comment)}
            className="font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            Reply
          </button>
        )}
        {comment.canRemove && (
          <button
            type="button"
            onClick={() => onRemove(comment)}
            className="flex items-center gap-1 font-semibold text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden />
            Remove
          </button>
        )}
      </div>
    </div>
  )
}
