'use client'

import { PlayCircle, Radio, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { ApiResult } from '@/types'

type LiveStatus = { live: boolean; videoId: string | null; watchUrl: string | null }

/**
 * "We are live now" — shown only while a service is actually streaming.
 *
 * Client-side and polled rather than server-rendered, because the home page is
 * cached and a service starting at 9:00 should show up without waiting for a
 * revalidation. The first check runs after mount so it never delays the page.
 *
 * The banner appears and disappears on its own. Nobody has to remember to
 * switch it off after the service, which is the failure mode of every
 * hand-managed "we are live" notice ever put on a church website.
 */
export function LiveBanner() {
  const [status, setStatus] = useState<LiveStatus | null>(null)
  const [watching, setWatching] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      try {
        const response = await fetch('/api/live')
        const result = (await response.json()) as ApiResult<LiveStatus>
        if (!cancelled && result.ok) setStatus(result.data)
      } catch {
        // Offline, or YouTube unreachable. No banner, no error — a visitor
        // does not need to be told that a background check failed.
      }
    }

    void check()
    // Every two minutes: long enough to be invisible on the bill, short enough
    // that the banner disappears soon after the stream ends.
    const timer = setInterval(check, 120_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  if (!status?.live || !status.videoId || dismissed) return null

  return (
    <section aria-label="Live now" className="border-b-2 border-destructive/30 bg-destructive/10">
      <div className="container py-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 rounded-full bg-destructive px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-destructive-foreground">
            {/* The dot pulses, but not for anyone who asked for less motion. */}
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
            Live now
          </span>

          <p className="min-w-0 flex-1 text-pretty font-display font-bold text-foreground">
            The service is streaming — come and join us.
          </p>

          <div className="flex items-center gap-2">
            {!watching && (
              <button
                type="button"
                onClick={() => setWatching(true)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-destructive px-5 font-display font-semibold text-destructive-foreground transition-opacity hover:opacity-90"
              >
                <PlayCircle className="size-5" aria-hidden />
                Watch here
              </button>
            )}
            <button
              type="button"
              onClick={() => setDismissed(true)}
              title="Hide this"
              className="grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
              <span className="sr-only">Hide the live banner</span>
            </button>
          </div>
        </div>

        {watching && (
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-border bg-black shadow-lifted">
            <div className="relative aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${status.videoId}?autoplay=1`}
                title="Live service"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 size-full"
              />
            </div>
          </div>
        )}

        {watching && status.watchUrl && (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Radio className="size-4" aria-hidden />
            Trouble playing?{' '}
            <a
              href={status.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              Open it on YouTube
            </a>
          </p>
        )}
      </div>
    </section>
  )
}
