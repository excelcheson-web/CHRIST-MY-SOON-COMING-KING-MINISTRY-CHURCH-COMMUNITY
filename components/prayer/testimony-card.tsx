'use client'

import { Heart, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

export type TestimonyCardData = {
  id: string
  title: string
  content: string
  category: string
  authorName: string
  likeCount: number
  isFeatured: boolean
  createdAt: string
  likedByMe: boolean
  comments: { id: string; authorName: string; content: string; createdAt: string }[]
}

const categoryLabels: Record<string, string> = {
  SALVATION: '❤️ Salvation',
  HEALING: '🩹 Healing',
  PROVISION: '🌾 Provision',
  BREAKTHROUGH: '🔓 Breakthrough',
  OTHER: '🎉 God story',
}

const TRUNCATE_AT = 320

export function TestimonyCard({ testimony }: { testimony: TestimonyCardData }) {
  const { status } = useSession()
  const [expanded, setExpanded] = useState(false)
  const [liked, setLiked] = useState(testimony.likedByMe)
  const [likes, setLikes] = useState(testimony.likeCount)
  const [comments, setComments] = useState(testimony.comments)
  const [showComments, setShowComments] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signedIn = status === 'authenticated'
  const isLong = testimony.content.length > TRUNCATE_AT
  const shown =
    expanded || !isLong ? testimony.content : `${testimony.content.slice(0, TRUNCATE_AT).trimEnd()}…`

  async function toggleLike() {
    if (!signedIn || busy) return

    const target = !liked
    setLiked(target)
    setLikes((value) => value + (target ? 1 : -1))
    setBusy(true)

    try {
      const response = await fetch(`/api/testimonies/${testimony.id}/like`, { method: 'POST' })
      const result = (await response.json()) as ApiResult<{ likeCount: number; liked: boolean }>
      if (result.ok) {
        setLikes(result.data.likeCount)
        setLiked(result.data.liked)
      } else {
        setLiked(!target)
        setLikes((value) => value + (target ? -1 : 1))
      }
    } catch {
      setLiked(!target)
      setLikes((value) => value + (target ? -1 : 1))
    } finally {
      setBusy(false)
    }
  }

  async function comment() {
    if (!text.trim()) return
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/testimonies/${testimony.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const result = (await response.json()) as ApiResult<{
        id: string
        authorName: string
        content: string
        createdAt: string
      }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not send that.' : result.error)
        return
      }

      setComments((current) => [...current, result.data])
      setText('')
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        'rounded-3xl border-2 bg-card p-6 shadow-soft sm:p-8',
        testimony.isFeatured ? 'border-accent/40' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
          {categoryLabels[testimony.category] ?? testimony.category}
        </span>
        {testimony.isFeatured && (
          <span className="flex items-center gap-1.5 rounded-full bg-accent-gradient px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-foreground">
            <Sparkles className="size-3.5" aria-hidden />
            Featured
          </span>
        )}
      </div>

      <h3 className="mt-4 font-display text-2xl font-bold text-foreground">{testimony.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {testimony.authorName} ·{' '}
        {new Date(testimony.createdAt).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>

      <p className="mt-5 whitespace-pre-line text-pretty leading-relaxed text-foreground/90">
        {shown}
      </p>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 min-h-11 font-semibold text-primary underline-offset-4 hover:underline"
        >
          {expanded ? 'Show less' : 'Read the whole story'}
        </button>
      )}

      <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
        <Button
          onClick={toggleLike}
          disabled={!signedIn || busy}
          variant={liked ? 'outline' : 'ghost'}
          size="sm"
          aria-pressed={liked}
          title={signedIn ? undefined : 'Sign in to encourage'}
        >
          <Heart className={cn('size-4', liked && 'fill-current text-destructive')} aria-hidden />
          {likes} {likes === 1 ? 'amen' : 'amens'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments((value) => !value)}
          aria-expanded={showComments}
        >
          <MessageCircle className="size-4" aria-hidden />
          {comments.length === 0
            ? 'Encourage them'
            : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
        </Button>
      </div>

      {showComments && (
        <div className="mt-5 space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          {comments.length > 0 && (
            <ul className="space-y-3">
              {comments.map((entry) => (
                <li key={entry.id} className="rounded-2xl bg-secondary/50 p-4">
                  <p className="text-pretty text-foreground/90">{entry.content}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">— {entry.authorName}</p>
                </li>
              ))}
            </ul>
          )}

          {signedIn ? (
            <div>
              <label htmlFor={`comment-${testimony.id}`} className="sr-only">
                Encourage the person who shared {testimony.title}
              </label>
              <textarea
                id={`comment-${testimony.id}`}
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={3}
                maxLength={400}
                placeholder="Say something kind…"
                className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={comment} disabled={busy || !text.trim()}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="size-4" aria-hidden />
                  )}
                  Send
                </Button>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-secondary/50 p-4 text-pretty text-muted-foreground">
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{' '}
              to say amen and leave an encouragement.
            </p>
          )}
        </div>
      )}
    </article>
  )
}
