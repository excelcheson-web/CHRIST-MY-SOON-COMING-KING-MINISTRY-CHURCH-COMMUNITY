'use client'

import { Loader2, Send } from 'lucide-react'
import { useState } from 'react'

import { PostCard } from '@/components/community/post-card'
import { Alert } from '@/components/ui/alert'
import type { FeedPost } from '@/lib/community-display'
import { channelHints } from '@/lib/reactions'
import type { ApiResult } from '@/types'
import type { PostChannel } from '@prisma/client'

type Person = { id: string; name: string }

/**
 * One of the smaller boards — the encouragement wall, verse reflections,
 * challenge entries, worship shares.
 *
 * A single component for all four because they are the same thing: a short
 * composer over a list of posts. Only the placeholder and whether a person can
 * be named actually differ, and both come from props.
 */
export function ChannelBoard({
  channel,
  initial,
  signedIn,
  canModerate,
  placeholder,
  people = [],
  emptyLine,
}: {
  channel: PostChannel
  initial: { posts: FeedPost[]; nextCursor: string | null }
  signedIn: boolean
  canModerate: boolean
  placeholder: string
  /** Only the encouragement wall names somebody. */
  people?: Person[]
  emptyLine: string
}) {
  const [posts, setPosts] = useState(initial.posts)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [body, setBody] = useState('')
  const [praisedId, setPraisedId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const namesSomeone = channel === 'ENCOURAGEMENT'

  async function submit() {
    const text = body.trim()
    if (!text) return

    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: text,
          channel,
          type: channel === 'ENCOURAGEMENT' ? 'ENCOURAGEMENT' : 'GENERAL',
          visibility: 'MEMBERS',
          praisedId: namesSomeone && praisedId ? praisedId : undefined,
        }),
      })
      const result = (await response.json()) as ApiResult<FeedPost>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setPosts((current) => [result.data, ...current])
      setBody('')
      setPraisedId('')
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function loadMore() {
    if (!cursor) return
    setBusy(true)
    try {
      const response = await fetch(
        `/api/community/posts?channel=${channel}&cursor=${cursor}`,
      )
      const result = (await response.json()) as ApiResult<{
        posts: FeedPost[]
        nextCursor: string | null
      }>
      if (result.ok) {
        setPosts((current) => [...current, ...result.data.posts])
        setCursor(result.data.nextCursor)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      {signedIn ? (
        <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}

          {namesSomeone && (
            <label className="mb-4 block">
              <span className="mb-1.5 block font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Who are you thanking?
              </span>
              <select
                value={praisedId}
                onChange={(event) => setPraisedId(event.target.value)}
                className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
              >
                <option value="">Everybody / not a specific person</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="sr-only">{placeholder}</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={3}
              maxLength={channel === 'ENCOURAGEMENT' ? 600 : 5000}
              placeholder={placeholder}
              className="w-full rounded-2xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
            />
          </label>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{channelHints[channel]}</p>
            <button
              type="button"
              onClick={submit}
              disabled={busy || !body.trim()}
              className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <Send className="size-5" aria-hidden />
              )}
              Post
            </button>
          </div>
        </div>
      ) : (
        <Alert variant="info">
          <a href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </a>{' '}
          to join in here.
        </Alert>
      )}

      {posts.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center text-pretty text-muted-foreground">
          {emptyLine}
        </p>
      ) : (
        <ul className="mt-8 space-y-5">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard
                post={post}
                signedIn={signedIn}
                canModerate={canModerate}
                onChanged={(id, change) =>
                  setPosts((current) =>
                    change === 'removed' ? current.filter((row) => row.id !== id) : current,
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={busy}
          className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card font-display font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Show older
        </button>
      )}
    </div>
  )
}
