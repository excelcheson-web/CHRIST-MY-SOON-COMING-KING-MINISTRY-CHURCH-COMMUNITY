'use client'

import { EyeOff, Flag, Loader2, MessageCircle, Pin, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { CommentThread } from '@/components/community/comment-thread'
import { PollCard } from '@/components/community/poll-card'
import { ReactionBar } from '@/components/community/reaction-bar'
import {
  postTypeEmoji,
  postTypeLabels,
  timeAgo,
  visibilityShort,
  type FeedPost,
} from '@/lib/community-display'
import { toEmbed } from '@/lib/embed'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

const roleBadges: Record<string, string> = {
  PASTOR: 'Pastor',
  ADMIN: 'Admin',
  LEADER: 'Leader',
  PRAYER_TEAM: 'Prayer team',
  FOLLOW_UP_TEAM: 'Follow-up',
}

export function PostCard({
  post,
  canModerate,
  signedIn,
  onChanged,
}: {
  post: FeedPost
  canModerate: boolean
  signedIn: boolean
  /** Lets the feed drop a removed post without a full refetch. */
  onChanged: (id: string, change: 'removed' | 'pinned' | 'unpinned') => void
}) {
  const [commentCount, setCommentCount] = useState(post.commentCount)
  const [showComments, setShowComments] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const video = toEmbed(post.videoUrl)

  async function remove() {
    if (!confirm('Remove this post?')) return
    setBusy(true)
    try {
      const response = await fetch(`/api/community/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove' }),
      })
      if (response.ok) onChanged(post.id, 'removed')
      else setNotice('We could not remove that.')
    } finally {
      setBusy(false)
    }
  }

  async function togglePin() {
    setBusy(true)
    const action = post.pinned ? 'unpin' : 'pin'
    try {
      const response = await fetch(`/api/community/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (response.ok) onChanged(post.id, post.pinned ? 'unpinned' : 'pinned')
    } finally {
      setBusy(false)
    }
  }

  async function report() {
    const reason = prompt('What is wrong with this post? A leader will read your report.')
    if (!reason?.trim()) return

    setBusy(true)
    try {
      const response = await fetch(`/api/community/posts/${post.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      setNotice(
        response.ok
          ? 'Thank you — a leader will look at this.'
          : 'We could not send that report.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={cn(
        'rounded-3xl border-2 bg-card p-6 shadow-soft sm:p-7',
        post.pinned ? 'border-primary/35' : 'border-border',
      )}
    >
      {post.pinned && (
        <p className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary">
          <Pin className="size-4" aria-hidden />
          Pinned by a leader
        </p>
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {post.authorImage ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary providers
            <img
              src={post.authorImage}
              alt=""
              className="size-12 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary"
            >
              {post.authorName.charAt(0).toUpperCase()}
            </span>
          )}

          <div>
            <p className="font-display font-bold text-foreground">
              {/* Only linked when we actually know who it is — an anonymous
                  post has no author id to link to. */}
              {post.authorId ? (
                <Link
                  href={`/community/members/${post.authorId}`}
                  className="rounded hover:text-primary hover:underline"
                >
                  {post.authorName}
                </Link>
              ) : (
                post.authorName
              )}
              {post.anonymous && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <EyeOff className="size-3" aria-hidden />
                  Anonymous
                </span>
              )}
              {!post.anonymous && roleBadges[post.authorRole] && (
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                  {roleBadges[post.authorRole]}
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">
              <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
              {' · '}
              {post.scopeLabel ?? visibilityShort[post.visibility]}
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
          <span aria-hidden>{postTypeEmoji[post.type]}</span>
          {postTypeLabels[post.type]}
        </span>
      </header>

      {/* Shout-outs lead with who is being thanked — that is the point of them. */}
      {post.praisedName && (
        <p className="mt-5 font-display text-lg font-bold text-accent-ink">
          <span aria-hidden>💛 </span>
          {post.praisedId ? (
            <Link
              href={`/community/members/${post.praisedId}`}
              className="rounded hover:underline"
            >
              {post.praisedName}
            </Link>
          ) : (
            post.praisedName
          )}
        </p>
      )}

      <p
        className={cn(
          'whitespace-pre-wrap text-pretty leading-relaxed text-foreground',
          post.praisedName ? 'mt-2' : 'mt-5',
        )}
      >
        {post.body}
      </p>

      {post.poll && (
        <PollCard
          poll={post.poll}
          signedIn={signedIn}
          onSignInNeeded={() => setNotice('Please sign in to vote.')}
        />
      )}

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- served from our own authenticated route, not an optimisable static asset
        <img
          src={post.imageUrl}
          alt=""
          loading="lazy"
          className="mt-5 w-full rounded-2xl border-2 border-border object-cover"
        />
      )}

      {video && (
        <div className="mt-5 aspect-video overflow-hidden rounded-2xl border-2 border-border">
          <iframe
            src={video.src}
            title="Shared video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            className="size-full"
          />
        </div>
      )}

      {notice && <p className="mt-4 text-sm font-semibold text-primary">{notice}</p>}

      <footer className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <ReactionBar
          postId={post.id}
          mine={post.myReaction}
          tally={post.reactions}
          signedIn={signedIn}
          onSignInNeeded={() => setNotice('Please sign in to react.')}
        />

        <button
          type="button"
          onClick={() => setShowComments((value) => !value)}
          aria-expanded={showComments}
          className="flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <MessageCircle className="size-5" aria-hidden />
          {commentCount > 0 ? commentCount : ''}
          <span className={commentCount > 0 ? 'sr-only' : undefined}>
            {showComments ? 'Hide replies' : 'Reply'}
          </span>
        </button>

        <span className="flex-1" />

        {canModerate && (
          <button
            type="button"
            onClick={togglePin}
            disabled={busy}
            className="flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
          >
            <Pin className="size-5" aria-hidden />
            {post.pinned ? 'Unpin' : 'Pin'}
          </button>
        )}

        {post.canRemove ? (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="size-5" aria-hidden />
            )}
            Remove
          </button>
        ) : (
          signedIn && (
            <button
              type="button"
              onClick={report}
              disabled={busy}
              className="flex min-h-11 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-60"
            >
              <Flag className="size-5" aria-hidden />
              <span className="sr-only sm:not-sr-only">Report</span>
            </button>
          )
        )}
      </footer>

      {showComments && (
        <CommentThread
          postId={post.id}
          signedIn={signedIn}
          onCountChange={(delta) => setCommentCount((count) => Math.max(0, count + delta))}
        />
      )}
    </article>
  )
}
