'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { ApiResult } from '@/types'

export type ChatMessage = {
  id: string
  seq: number
  body: string
  authorId: string | null
  authorName: string
  isSystem: boolean
  isMine: boolean
  editedAt: string | null
  deletedAt: string | null
  flagged: boolean
  replyTo: { id: string; authorName: string; excerpt: string } | null
  attachments: {
    id: string
    fileName: string
    mimeType: string
    size: number
    width: number | null
    height: number | null
  }[]
  createdAt: string
}

type MessagePage = { messages: ChatMessage[]; cursor: number; hasMore: boolean }

/**
 * The transport. Everything realtime-shaped about this app lives in this hook.
 *
 * There is no socket server — the deployment has Neon and nothing else — so it
 * works in two layers:
 *
 * 1. **Server-Sent Events (preferred).** One long-lived connection per open
 *    conversation. The server holds a single shared watcher per conversation
 *    (see `lib/chat-watch.ts`) and pushes a tiny "new messages up to seq N"
 *    nudge; this hook then fetches the delta through the normal endpoint.
 *    Messages land in about a second, and ten people in one conversation cost
 *    the database the same as one.
 *
 * 2. **Timer polling (fallback).** If SSE cannot connect — a proxy that buffers,
 *    a platform that will not hold connections — it drops back to asking on a
 *    timer, and keeps working.
 *
 * Either way the tab stops entirely when hidden and catches up on return, so a
 * forgotten background tab never quietly runs up Neon compute.
 */
const FAST_MS = 3_000
const SLOW_MS = 30_000
/** Slow heartbeat while SSE is healthy — a safety net, not the mechanism. */
const STREAM_IDLE_MS = 60_000
const BACKOFF = 1.6

export type TransportMode = 'connecting' | 'stream' | 'polling'

export function useMessageStream(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(true)
  const [mode, setMode] = useState<TransportMode>('connecting')

  const cursorRef = useRef(0)
  const intervalRef = useRef(FAST_MS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlightRef = useRef(false)
  const streamingRef = useRef(false)

  /** Merge by seq — a resend or an overlapping page must not duplicate rows. */
  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return
    setMessages((current) => {
      const bySeq = new Map(current.map((m) => [m.seq, m]))
      for (const message of incoming) bySeq.set(message.seq, message)
      return [...bySeq.values()].sort((a, b) => a.seq - b.seq)
    })
  }, [])

  const poll = useCallback(
    async (reset = false) => {
      if (inFlightRef.current) return
      inFlightRef.current = true

      try {
        const query = reset || cursorRef.current === 0 ? '' : `?after=${cursorRef.current}`
        const response = await fetch(`/api/chat/conversations/${conversationId}/messages${query}`)
        const result = (await response.json()) as ApiResult<MessagePage>

        if (!result.ok) {
          setError(result.error)
          return
        }

        setError(null)
        const { messages: batch, cursor } = result.data

        if (batch.length > 0) {
          merge(batch)
          // While streaming, the SSE nudge is the trigger — no need to hurry.
          intervalRef.current = streamingRef.current ? STREAM_IDLE_MS : FAST_MS
        } else {
          intervalRef.current = streamingRef.current
            ? STREAM_IDLE_MS
            : Math.min(SLOW_MS, Math.round(intervalRef.current * BACKOFF))
        }

        if (cursor > cursorRef.current) cursorRef.current = cursor
      } catch {
        // Offline or a blip. Back off rather than hammering.
        intervalRef.current = Math.min(SLOW_MS, Math.round(intervalRef.current * BACKOFF))
      } finally {
        inFlightRef.current = false
        setLoading(false)
      }
    },
    [conversationId, merge],
  )

  /** Called after sending, so your own message appears without waiting. */
  const refreshNow = useCallback(() => {
    intervalRef.current = FAST_MS
    void poll()
  }, [poll])

  useEffect(() => {
    let stopped = false

    const schedule = () => {
      if (stopped) return
      timerRef.current = setTimeout(async () => {
        if (document.visibilityState === 'visible') await poll()
        schedule()
      }, intervalRef.current)
    }

    const onVisibility = () => {
      const visible = document.visibilityState === 'visible'
      setLive(visible)
      if (visible) {
        // Catch up immediately on return, then resume the fast cadence.
        intervalRef.current = FAST_MS
        void poll()
      }
    }

    void poll(true)
    schedule()
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopped = true
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [poll])

  // Layer 1: try to hold a live connection. EventSource reconnects by itself,
  // so there is no retry logic here — only a fallback if it never opens.
  useEffect(() => {
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      setMode('polling')
      return
    }

    let source: EventSource | null = null
    let openedOnce = false

    const connect = () => {
      source = new EventSource(
        `/api/chat/conversations/${conversationId}/stream?since=${cursorRef.current}`,
      )

      source.addEventListener('ready', () => {
        openedOnce = true
        streamingRef.current = true
        intervalRef.current = STREAM_IDLE_MS
        setMode('stream')
      })

      source.addEventListener('messages', () => {
        void poll()
      })

      source.onerror = () => {
        // EventSource retries on its own. If it never opened at all, the
        // environment cannot do SSE — stand the timer back up and say so.
        if (!openedOnce) {
          streamingRef.current = false
          intervalRef.current = FAST_MS
          setMode('polling')
          source?.close()
          source = null
        }
      }
    }

    connect()

    return () => {
      streamingRef.current = false
      source?.close()
    }
  }, [conversationId, poll])

  return {
    messages,
    loading,
    error,
    live,
    mode,
    refreshNow,
    cursor: () => cursorRef.current,
  }
}
