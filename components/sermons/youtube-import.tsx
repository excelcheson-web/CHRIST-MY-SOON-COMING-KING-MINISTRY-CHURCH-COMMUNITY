'use client'

import { Check, Download, Loader2, RefreshCw, Youtube } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

type FeedVideo = {
  videoId: string
  title: string
  description: string
  publishedAt: string
  url: string
  thumbnail: string
  isShort: boolean
  imported: boolean
}

/**
 * Picking which YouTube uploads become sermons.
 *
 * A pick-list rather than a "sync everything" button, for one reason: a church
 * channel carries Shorts and clips alongside the messages, and a thirty-second
 * clip filed as a sermon is noise in the one place people go looking for
 * teaching. Shorts are flagged and left unticked; everything else is ticked by
 * default, so the common case is still two clicks.
 */
export function YouTubeImport({ defaultSpeaker }: { defaultSpeaker: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [videos, setVideos] = useState<FeedVideo[] | null>(null)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [publish, setPublish] = useState(true)
  const [speaker, setSpeaker] = useState(defaultSpeaker)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    setDone(null)
    try {
      const response = await fetch('/api/sermons/youtube')
      const result = (await response.json()) as ApiResult<{ videos: FeedVideo[] }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        setVideos([])
        return
      }

      setVideos(result.data.videos)
      // Everything that is not already in and not a Short.
      setChosen(
        new Set(
          result.data.videos
            .filter((video) => !video.imported && !video.isShort)
            .map((video) => video.videoId),
        ),
      )
    } catch {
      setError('We could not reach YouTube. Check the connection and try again.')
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && videos === null) void load()
  }

  function toggle(videoId: string) {
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(videoId)) next.delete(videoId)
      else next.add(videoId)
      return next
    })
  }

  async function submit() {
    if (chosen.size === 0) return
    setImporting(true)
    setError(null)
    setDone(null)
    try {
      const response = await fetch('/api/sermons/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: [...chosen], publish, speaker }),
      })
      const result = (await response.json()) as ApiResult<{ created: number; skipped: number }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      const { created, skipped } = result.data
      setDone(
        `${created} sermon${created === 1 ? '' : 's'} brought in${
          skipped > 0 ? `, ${skipped} already here` : ''
        }. ${publish ? 'They are live now.' : 'They are drafts until you publish them.'}`,
      )
      await load()
      router.refresh()
    } catch {
      setError('We could not reach the server.')
    } finally {
      setImporting(false)
    }
  }

  const available = videos?.filter((video) => !video.imported) ?? []

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
            <Youtube className="size-6 text-primary" aria-hidden />
            Bring in from YouTube
          </h2>
          <p className="mt-1.5 max-w-xl text-pretty text-muted-foreground">
            Everything you upload to the church channel can become a sermon here, and it plays
            inside the site — nobody is sent off to YouTube and its suggestions.
          </p>
        </div>

        <button
          type="button"
          onClick={toggleOpen}
          className="flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Youtube className="size-5" aria-hidden />
          {open ? 'Close' : 'Show the channel'}
        </button>
      </div>

      {open && (
        <div className="mt-6 border-t-2 border-border pt-6">
          {error && <Alert variant="error">{error}</Alert>}
          {done && (
            <Alert variant="success" className={error ? 'mt-4' : undefined}>
              {done}
            </Alert>
          )}

          {loading && (
            <p className="flex items-center gap-2 py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Reading the channel…
            </p>
          )}

          {!loading && videos !== null && videos.length === 0 && !error && (
            <p className="py-8 text-pretty text-muted-foreground">
              Nothing came back from the channel. YouTube&rsquo;s feed carries the fifteen most
              recent uploads — if the channel is new, upload something first.
            </p>
          )}

          {!loading && available.length > 0 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-display font-semibold text-foreground">
                    Who preached these
                  </span>
                  <Input
                    value={speaker}
                    onChange={(event) => setSpeaker(event.target.value)}
                    maxLength={120}
                  />
                  <span className="mt-1.5 block text-sm text-muted-foreground">
                    You can change it on any sermon afterwards.
                  </span>
                </label>

                <label className="flex items-start gap-3 self-start rounded-2xl border-2 border-border p-4">
                  <input
                    type="checkbox"
                    checked={publish}
                    onChange={(event) => setPublish(event.target.checked)}
                    className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
                  />
                  <span>
                    <span className="block font-display font-semibold text-foreground">
                      Publish them straight away
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      Untick to bring them in as drafts and check them first.
                    </span>
                  </span>
                </label>
              </div>

              <ul className="mt-6 space-y-3">
                {videos?.map((video) => {
                  const picked = chosen.has(video.videoId)
                  return (
                    <li key={video.videoId}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition-colors',
                          video.imported
                            ? 'cursor-default border-border bg-secondary/40 opacity-70'
                            : picked
                              ? 'border-primary/40 bg-primary-soft/40'
                              : 'border-border hover:border-primary/25',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={picked}
                          disabled={video.imported}
                          onChange={() => toggle(video.videoId)}
                          className="mt-1 size-6 shrink-0 rounded border-2 border-input"
                        />

                        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail, fixed shape */}
                        <img
                          src={video.thumbnail}
                          alt=""
                          loading="lazy"
                          className="hidden h-16 w-28 shrink-0 rounded-lg object-cover sm:block"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            {video.imported && (
                              <span className="flex items-center gap-1 rounded-full bg-success/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-success">
                                <Check className="size-3.5" aria-hidden />
                                Already here
                              </span>
                            )}
                            {video.isShort && !video.imported && (
                              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Looks like a Short
                              </span>
                            )}
                          </span>
                          <span className="mt-1.5 block text-pretty font-display font-bold text-foreground">
                            {video.title}
                          </span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">
                            {new Date(video.publishedAt).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-6">
                <button
                  type="button"
                  onClick={submit}
                  disabled={importing || chosen.size === 0}
                  className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {importing ? (
                    <Loader2 className="size-5 animate-spin" aria-hidden />
                  ) : (
                    <Download className="size-5" aria-hidden />
                  )}
                  Bring in {chosen.size} {chosen.size === 1 ? 'message' : 'messages'}
                </button>

                <button
                  type="button"
                  onClick={load}
                  disabled={loading || importing}
                  className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-5 font-display font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                >
                  <RefreshCw className="size-5" aria-hidden />
                  Check again
                </button>
              </div>
            </>
          )}

          {!loading && videos !== null && videos.length > 0 && available.length === 0 && (
            <p className="flex items-center gap-2 py-8 font-semibold text-success">
              <Check className="size-5" aria-hidden />
              Every upload on the channel is already in the sermon centre.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
