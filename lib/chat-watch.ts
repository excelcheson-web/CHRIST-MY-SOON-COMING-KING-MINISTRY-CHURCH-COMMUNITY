import 'server-only'

import { prisma } from '@/lib/prisma'

/**
 * Shared per-conversation watcher behind the SSE stream.
 *
 * The naive way to do "live" chat on a database is to have every client poll
 * for messages. Ten people in one conversation means ten full fetches per tick.
 *
 * This inverts it: **one** watcher per conversation asks the cheapest possible
 * question — `SELECT max(seq)` against an index — and fans the answer out to
 * every listener on this server. Ten viewers cost the same as one, and the full
 * message fetch only happens when something has actually changed.
 *
 * Latency drops to about a second, and the database does *less* work than the
 * plain polling it replaces.
 *
 * Caveat worth knowing: module state is per server process. On a long-running
 * Node server (`npm start`, a VPS, Railway, Render) every viewer shares one
 * watcher. On serverless, sharing only happens within an instance — still
 * correct, just less of a saving.
 */

const TICK_MS = 1_000
/** Drop a watcher once nobody is listening, so idle conversations cost nothing. */
const IDLE_GRACE_MS = 5_000

type Listener = (seq: number) => void

type Watcher = {
  listeners: Set<Listener>
  lastSeq: number
  timer: ReturnType<typeof setInterval> | null
  reaper: ReturnType<typeof setTimeout> | null
}

const watchers = new Map<string, Watcher>()

async function currentMaxSeq(conversationId: string) {
  if (!prisma) return 0
  const row = await prisma.message.aggregate({
    where: { conversationId },
    _max: { seq: true },
  })
  return row._max.seq ?? 0
}

function stop(conversationId: string) {
  const watcher = watchers.get(conversationId)
  if (!watcher) return
  if (watcher.timer) clearInterval(watcher.timer)
  if (watcher.reaper) clearTimeout(watcher.reaper)
  watchers.delete(conversationId)
}

/**
 * Subscribes to "something changed" nudges for a conversation.
 *
 * Deliberately carries only the new max seq, not the messages themselves — the
 * client then calls the normal messages endpoint, so access control, blocking
 * and serialisation all stay in exactly one place.
 */
export function watchConversation(
  conversationId: string,
  listener: Listener,
  startingSeq: number,
) {
  let watcher = watchers.get(conversationId)

  if (!watcher) {
    watcher = { listeners: new Set(), lastSeq: startingSeq, timer: null, reaper: null }
    watchers.set(conversationId, watcher)

    watcher.timer = setInterval(async () => {
      const current = watchers.get(conversationId)
      if (!current) return

      try {
        const seq = await currentMaxSeq(conversationId)
        if (seq > current.lastSeq) {
          current.lastSeq = seq
          for (const notify of current.listeners) notify(seq)
        }
      } catch {
        // A blip should not tear the stream down; the next tick tries again.
      }
    }, TICK_MS)
  }

  if (watcher.reaper) {
    clearTimeout(watcher.reaper)
    watcher.reaper = null
  }

  watcher.listeners.add(listener)

  return () => {
    const current = watchers.get(conversationId)
    if (!current) return
    current.listeners.delete(listener)

    if (current.listeners.size === 0) {
      // Small grace period so a page refresh does not churn the watcher.
      current.reaper = setTimeout(() => {
        const latest = watchers.get(conversationId)
        if (latest && latest.listeners.size === 0) stop(conversationId)
      }, IDLE_GRACE_MS)
    }
  }
}

/** Diagnostics for the admin page. */
export function watcherStats() {
  return {
    conversations: watchers.size,
    listeners: [...watchers.values()].reduce((total, w) => total + w.listeners.size, 0),
  }
}
