'use client'

import { Loader2, MessagesSquare } from 'lucide-react'
import { useState } from 'react'

import { Composer } from '@/components/community/composer'
import { PostCard } from '@/components/community/post-card'
import { postTypeEmoji, postTypeLabels, type FeedPost } from '@/lib/community-display'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

type FeedPage = { posts: FeedPost[]; nextCursor: string | null }

const filters = [
  { value: 'all', label: 'Everything', emoji: '🌍' },
  ...(['PRAYER', 'TESTIMONY', 'QUESTION', 'ENCOURAGEMENT', 'GENERAL'] as const).map((type) => ({
    value: type,
    label: postTypeLabels[type],
    emoji: postTypeEmoji[type],
  })),
]

/**
 * The community feed.
 *
 * Server-rendered for the first page — so a visitor sees posts with no
 * JavaScript round trip — then this takes over for filtering, paging and the
 * optimistic updates that make posting feel immediate.
 */
export function Feed({
  initial,
  signedIn,
  canModerate,
  ministries,
  smallGroups,
}: {
  initial: FeedPage
  signedIn: boolean
  canModerate: boolean
  ministries: { id: string; name: string }[]
  smallGroups: { id: string; name: string }[]
}) {
  const [posts, setPosts] = useState(initial.posts)
  const [cursor, setCursor] = useState(initial.nextCursor)
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(false)

  async function load(nextFilter: string, nextCursor: string | null, replace: boolean) {
    setBusy(true)
    try {
      const params = new URLSearchParams()
      if (nextFilter !== 'all') params.set('type', nextFilter)
      if (nextCursor) params.set('cursor', nextCursor)

      const response = await fetch(`/api/community/posts?${params}`)
      const result = (await response.json()) as ApiResult<FeedPage>
      if (!result.ok) return

      setPosts((current) => (replace ? result.data.posts : [...current, ...result.data.posts]))
      setCursor(result.data.nextCursor)
    } catch {
      // Leaving what is already on screen is better than blanking the feed.
    } finally {
      setBusy(false)
    }
  }

  function changeFilter(value: string) {
    setFilter(value)
    void load(value, null, true)
  }

  function handleChange(id: string, change: 'removed' | 'pinned' | 'unpinned') {
    setPosts((current) => {
      if (change === 'removed') return current.filter((post) => post.id !== id)

      const pinned = change === 'pinned'
      const next = current.map((post) => (post.id === id ? { ...post, pinned } : post))
      // Keep the server's ordering rule — pinned first, then newest.
      return [...next].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.createdAt.localeCompare(a.createdAt)
      })
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 2xl:gap-16">
      <div className="min-w-0">
        {signedIn && (
          <div className="mb-8">
            <Composer
              ministries={ministries}
              smallGroups={smallGroups}
              onPosted={(post) => setPosts((current) => [post, ...current])}
            />
          </div>
        )}

        <nav aria-label="Filter posts" className="mb-6">
          <ul className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <li key={item.value}>
                <button
                  type="button"
                  onClick={() => changeFilter(item.value)}
                  aria-pressed={filter === item.value}
                  className={cn(
                    'flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 font-semibold transition-colors',
                    filter === item.value
                      ? 'border-primary/35 bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground',
                  )}
                >
                  <span aria-hidden>{item.emoji}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {posts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-12 text-center">
            <MessagesSquare className="mx-auto size-10 text-muted-foreground" aria-hidden />
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              {filter === 'all' ? 'Nothing here yet' : 'Nothing of that kind yet'}
            </p>
            <p className="mx-auto mt-2 max-w-md text-pretty text-muted-foreground">
              {signedIn
                ? 'Start the conversation — share what God has been doing, or ask the family to pray.'
                : 'Sign in to see what the church family is sharing and to join in.'}
            </p>
          </div>
        ) : (
          <ul aria-live="polite" className="space-y-6">
            {posts.map((post) => (
              <li key={post.id}>
                <PostCard
                  post={post}
                  signedIn={signedIn}
                  canModerate={canModerate}
                  onChanged={handleChange}
                />
              </li>
            ))}
          </ul>
        )}

        {cursor && (
          <button
            type="button"
            onClick={() => void load(filter, cursor, false)}
            disabled={busy}
            className="mt-8 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card font-display font-semibold text-foreground transition-colors hover:border-primary/30 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Show older posts
          </button>
        )}
      </div>

      <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border-2 border-border bg-secondary/40 p-6">
          <h2 className="text-lg">How we talk here</h2>
          <ul className="mt-4 space-y-3 text-pretty text-muted-foreground">
            <li>💛 Be kind. Assume the best of each other.</li>
            <li>🙏 Pray for what people share, not just react to it.</li>
            <li>🤫 What is said in a group post stays in the group.</li>
            <li>🚩 If something is wrong, report it — a leader will read it.</li>
          </ul>
        </div>

        {!signedIn && (
          <div className="rounded-3xl bg-royal-gradient p-6 text-white">
            <h2 className="text-lg text-white">Join the family</h2>
            <p className="mt-3 text-pretty text-white/85">
              Create a free account to post, reply and see what members are sharing.
            </p>
            <a
              href="/register"
              className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-accent-gradient px-4 font-display font-semibold text-accent-foreground transition-all hover:brightness-105"
            >
              Create your account
            </a>
          </div>
        )}
      </aside>
    </div>
  )
}
