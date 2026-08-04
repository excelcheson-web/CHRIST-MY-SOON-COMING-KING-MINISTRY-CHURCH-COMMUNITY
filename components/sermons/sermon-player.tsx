'use client'

import { Headphones, PlayCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type PlayerProps = {
  slug: string
  embed: { kind: 'youtube' | 'vimeo' | 'facebook'; src: string } | null
  audioUrl: string | null
  /** Shown when a link was saved but is not something we can embed. */
  fallbackUrl: string | null
}

/**
 * The final iframe source, with autoplay added the way each provider wants it.
 *
 * The separator has to be worked out rather than assumed: Facebook's plugin
 * URL already carries a query string (`?href=…`), so the old unconditional
 * `?autoplay=1` produced a URL with two question marks in it and a player that
 * silently refused to load. `rel=0` is YouTube-only and is left off the others.
 */
function playerSrc(embed: NonNullable<PlayerProps['embed']>) {
  const separator = embed.src.includes('?') ? '&' : '?'
  const params = embed.kind === 'youtube' ? 'autoplay=1&rel=0' : 'autoplay=1'
  return `${embed.src}${separator}${params}`
}

/**
 * The sermon player, plus view tracking.
 *
 * Tracking is deliberately fire-and-forget: a failed counter must never
 * interrupt someone listening to a sermon, so every call swallows its error.
 *
 * The video is only counted when the person presses play, because a YouTube
 * iframe cannot tell us anything from outside without loading their tracking
 * script — which is also why the embed is `youtube-nocookie` and never renders
 * until it is clicked.
 */
export function SermonPlayer({ slug, embed, audioUrl, fallbackUrl }: PlayerProps) {
  const [playing, setPlaying] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)
  const counted = useRef(false)

  function track(watchSeconds: number, completed: boolean) {
    void fetch(`/api/sermons/${slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchSeconds: Math.round(watchSeconds), completed }),
      keepalive: true,
    }).catch(() => undefined)
  }

  function countOnce() {
    if (counted.current) return
    counted.current = true
    track(0, false)
  }

  // Report final progress when the tab closes, so a listen that ends by
  // navigating away is not lost.
  useEffect(() => {
    const element = audio.current
    return () => {
      if (counted.current && element && element.currentTime > 5) {
        track(element.currentTime, element.ended)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unmount only
  }, [])

  if (embed) {
    return (
      <div className="overflow-hidden rounded-3xl border-2 border-border bg-black shadow-lifted">
        <div className="relative aspect-video">
          {playing ? (
            <iframe
              src={playerSrc(embed)}
              title="Sermon video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setPlaying(true)
                countOnce()
              }}
              className="group absolute inset-0 grid place-items-center bg-royal-gradient text-white transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
            >
              <span className="flex flex-col items-center gap-3">
                <PlayCircle
                  className="size-20 transition-transform group-hover:scale-110"
                  aria-hidden
                />
                <span className="font-display text-lg font-bold">Play the sermon</span>
                <span className="text-sm text-white/70">
                  The video only loads once you press play
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    )
  }

  if (audioUrl) {
    return (
      <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-8">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
          <Headphones className="size-5 text-primary" aria-hidden />
          Listen to this sermon
        </p>
        <audio
          ref={audio}
          controls
          preload="metadata"
          src={audioUrl}
          onPlay={countOnce}
          onEnded={(event) => track(event.currentTarget.duration, true)}
          className="mt-4 w-full"
        >
          Your browser cannot play audio.{' '}
          <a href={audioUrl} download>
            Download the recording instead
          </a>
          .
        </audio>
        <a
          href={audioUrl}
          download
          className="mt-4 inline-flex font-semibold text-primary underline-offset-4 hover:underline"
        >
          Download the audio
        </a>
      </div>
    )
  }

  if (fallbackUrl) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center">
        <p className="text-pretty text-muted-foreground">
          This sermon is hosted somewhere we cannot play in the page.
        </p>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Open the recording
        </a>
      </div>
    )
  }

  return null
}
