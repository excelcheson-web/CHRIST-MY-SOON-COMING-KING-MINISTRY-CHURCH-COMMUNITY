'use client'

import { Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ApiResult } from '@/types'

export type BoardPost = {
  id: string
  authorName: string
  content: string
  createdAt: string
  pinned: boolean
}

/**
 * The group discussion board. A plain, slow message board on purpose — real-time
 * chat lands in Phase 4, and this is what the group actually needs first.
 */
export function GroupBoard({
  slug,
  posts,
  canPost,
}: {
  slug: string
  posts: BoardPost[]
  canPost: boolean
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!text.trim()) return
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/prayer/groups/${slug}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not post that.' : result.error)
        return
      }

      setText('')
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="board" className="mt-12">
      <h2 id="board" className="text-2xl sm:text-3xl">
        Group board
      </h2>

      {canPost ? (
        <div className="mt-6 rounded-3xl border-2 border-border bg-card p-5 shadow-soft sm:p-6">
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          <label htmlFor="group-post" className="sr-only">
            Write a message to the group
          </label>
          <textarea
            id="group-post"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Share an update, a scripture, or a need…"
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={submit} disabled={busy || !text.trim()}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              Post to the group
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-5 text-pretty text-muted-foreground">
          Join the group to read and write on the board.
        </p>
      )}

      {canPost && (
        <ul className="mt-8 space-y-4">
          {posts.length === 0 ? (
            <li className="rounded-2xl border-2 border-dashed border-border bg-secondary/30 p-8 text-center text-muted-foreground">
              Nothing on the board yet. Say hello 👋
            </li>
          ) : (
            posts.map((post) => (
              <li
                key={post.id}
                className="rounded-2xl border-2 border-border bg-card p-5 shadow-soft"
              >
                {post.pinned && (
                  <span className="mb-2 inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-ink">
                    Pinned
                  </span>
                )}
                <p className="whitespace-pre-line text-pretty text-foreground/90">{post.content}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {post.authorName} ·{' '}
                  {new Date(post.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </li>
            ))
          )}
        </ul>
      )}
    </section>
  )
}
