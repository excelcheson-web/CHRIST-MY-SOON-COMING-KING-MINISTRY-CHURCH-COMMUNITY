import { jsonError, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { checkAccess, getChatSettings } from '@/lib/chat'
import { watchConversation } from '@/lib/chat-watch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * How long one stream may stay open, in seconds.
 *
 * Serverless platforms cap a function's lifetime, so an SSE connection is
 * always going to be cut eventually — on Vercel's free tier that happens
 * after about 60 seconds whatever we ask for. That is survivable rather than
 * fatal: `useMessageStream` reconnects, and falls back to timer polling if it
 * cannot. Naming the limit here means the cut is a planned reconnect instead
 * of an unexplained error in somebody's console.
 *
 * A long-running host (a VPS, Railway, Fly) ignores this and holds the stream
 * open for as long as the browser wants it.
 */
export const maxDuration = 60

/** Nudge the browser to reconnect well before any proxy or platform timeout. */
const MAX_LIFETIME_MS = 4 * 60 * 1000
const HEARTBEAT_MS = 20 * 1000

/**
 * GET /api/chat/conversations/[id]/stream — Server-Sent Events.
 *
 * Sends "there is something new, up to seq N" and nothing else. The client then
 * calls the ordinary messages endpoint for the delta, which keeps access
 * control, blocking and serialisation in exactly one place rather than
 * duplicated into a second transport.
 *
 * The connection closes itself after four minutes; EventSource reconnects on
 * its own, so this survives platform timeouts and dropped Wi-Fi without any
 * reconnection logic of ours.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)

  const url = new URL(request.url)
  const since = Number(url.searchParams.get('since') ?? '0')

  try {
    const db = requirePrisma()

    const settings = await getChatSettings(db)
    if (!settings.enabled) return jsonError('Chat is switched off at the moment.', 503)

    const access = await checkAccess(db, params.id, user)
    if (!access.ok) return jsonError(access.error, access.status)

    const encoder = new TextEncoder()
    let unsubscribe: (() => void) | null = null
    let heartbeat: ReturnType<typeof setInterval> | null = null
    let lifetime: ReturnType<typeof setTimeout> | null = null

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const send = (event: string, data: string) => {
          try {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`))
          } catch {
            // Client vanished mid-write; teardown below handles it.
          }
        }

        const close = () => {
          unsubscribe?.()
          if (heartbeat) clearInterval(heartbeat)
          if (lifetime) clearTimeout(lifetime)
          try {
            controller.close()
          } catch {
            // Already closed.
          }
        }

        // Tell the client we are live so it can stand its timer down.
        send('ready', JSON.stringify({ since: Number.isFinite(since) ? since : 0 }))

        unsubscribe = watchConversation(
          params.id,
          (seq) => send('messages', JSON.stringify({ seq })),
          Number.isFinite(since) ? since : 0,
        )

        // Comment frames keep intermediaries from closing an idle connection.
        heartbeat = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keep-alive\n\n'))
          } catch {
            close()
          }
        }, HEARTBEAT_MS)

        lifetime = setTimeout(close, MAX_LIFETIME_MS)
        request.signal.addEventListener('abort', close)
      },

      cancel() {
        unsubscribe?.()
        if (heartbeat) clearInterval(heartbeat)
        if (lifetime) clearTimeout(lifetime)
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        // Nginx and friends buffer responses by default, which breaks SSE.
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (error) {
    console.error('[chat stream]', error)
    return jsonError('Could not open the live connection.', 500)
  }
}
