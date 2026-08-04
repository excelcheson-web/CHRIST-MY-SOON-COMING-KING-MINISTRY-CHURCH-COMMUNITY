import 'server-only'

/**
 * Optional AI, on a free tier — and a hard limit on what may leave this server.
 *
 * ## The rule
 *
 * **Only content that is already public may be sent to an outside model.**
 *
 * That is not a style preference. Google's free Gemini tier says plainly that
 * it uses submitted content "to provide, improve, and develop Google products"
 * and that "human reviewers may read, annotate, and process your API input and
 * output". Groq's free tier is comparable. A sermon transcript is fine — it was
 * preached to a room and published on this website. A prayer request saying "my
 * marriage is failing" is not, and neither is a benevolence request, a chat
 * message, or a members-only post.
 *
 * So the rule is enforced by the type system rather than by remembering: every
 * entry point takes `PublicText`, and the only way to make one is
 * `markPublic()`, which is called in exactly one place (`lib/sermon-qa.ts`, on
 * a PUBLISHED sermon's own transcript). Anything else will not compile.
 *
 * If you ever want AI over private content, use the `ollama` provider — it runs
 * on your own machine and nothing leaves the building. That is the only
 * configuration where sending private text would be defensible, and even then
 * it should be a decision the church makes on purpose.
 *
 * ## Providers
 *
 * | `AI_PROVIDER` | Cost | Notes |
 * | --- | --- | --- |
 * | unset / `none` | — | No AI. Everything still works; see the fallback below. |
 * | `gemini` | Free tier | Best quality for nothing. Needs `GEMINI_API_KEY`. |
 * | `groq` | Free tier | Very fast, open models. Needs `GROQ_API_KEY`. |
 * | `ollama` | Free | Runs locally. Private. Needs a machine with some RAM. |
 *
 * Nothing here is required. With no provider configured, sermon Q&A falls back
 * to search over the transcript, which is genuinely useful on its own.
 */

/**
 * Text that is safe to send to a third party.
 *
 * A branded type: structurally a string, but nothing can be assigned to it
 * except via `markPublic`. That turns "do not send private data to Google"
 * from a rule somebody has to remember into one the compiler enforces.
 */
export type PublicText = string & { readonly __public: unique symbol }

/**
 * Declares that this text is already public.
 *
 * Call this **only** for content that is visible to anyone on the open
 * internet without signing in. Every call site should be obvious on inspection
 * and should say why in a comment.
 */
export function markPublic(text: string, _because: PublicReason): PublicText {
  return text as PublicText
}

/** Forces the caller to name the reason, so a careless call reads wrong. */
export type PublicReason =
  | 'published sermon transcript — preached publicly and on the public website'
  | 'published sermon notes — on the public website'

export type AiProvider = 'gemini' | 'groq' | 'ollama' | 'none'

export type AiConfig = {
  provider: AiProvider
  model: string
  /** True when a request could actually be made. */
  ready: boolean
  /** Whether this provider keeps the text on our own hardware. */
  private: boolean
  label: string
}

/**
 * What is configured right now.
 *
 * Read at call time rather than at module load, so adding a key to `.env` and
 * restarting is all it takes — no build step, no code change.
 */
export function aiConfig(): AiConfig {
  const provider = (process.env.AI_PROVIDER ?? 'none').trim().toLowerCase() as AiProvider

  switch (provider) {
    case 'gemini':
      return {
        provider,
        // Overridable: Google renames models faster than anybody can keep up,
        // and a stale id here would be a silent outage.
        model: process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash-lite',
        ready: Boolean(process.env.GEMINI_API_KEY?.trim()),
        private: false,
        label: 'Google Gemini (free tier)',
      }
    case 'groq':
      return {
        provider,
        model: process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile',
        ready: Boolean(process.env.GROQ_API_KEY?.trim()),
        private: false,
        label: 'Groq (free tier)',
      }
    case 'ollama':
      return {
        provider,
        model: process.env.OLLAMA_MODEL?.trim() || 'llama3.2',
        ready: Boolean(process.env.OLLAMA_URL?.trim()),
        private: true,
        label: 'Ollama (on your own machine)',
      }
    default:
      return { provider: 'none', model: '', ready: false, private: true, label: 'No AI configured' }
  }
}

export type AskResult =
  | { ok: true; text: string; provider: AiProvider }
  | { ok: false; reason: 'not-configured' | 'failed' | 'timeout' }

/** Free tiers are slow sometimes; a sermon page must not hang waiting. */
const TIMEOUT_MS = 20_000

/**
 * Sends a grounded question to whichever free model is configured.
 *
 * `context` is `PublicText` by design — see the note at the top of this file.
 * Never throws: a failed AI call must degrade to the search results, never
 * break the page.
 */
export async function askGrounded({
  question,
  context,
  system,
}: {
  question: string
  context: PublicText
  system: string
}): Promise<AskResult> {
  const config = aiConfig()
  if (!config.ready) return { ok: false, reason: 'not-configured' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const text = await callProvider(config, { question, context, system }, controller.signal)
    return text ? { ok: true, text, provider: config.provider } : { ok: false, reason: 'failed' }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, reason: 'timeout' }
    }
    console.error('[ai]', error)
    return { ok: false, reason: 'failed' }
  } finally {
    clearTimeout(timer)
  }
}

async function callProvider(
  config: AiConfig,
  input: { question: string; context: PublicText; system: string },
  signal: AbortSignal,
): Promise<string | null> {
  const prompt = `${input.system}\n\n--- SERMON EXTRACTS ---\n${input.context}\n--- END EXTRACTS ---\n\nQuestion: ${input.question}`

  switch (config.provider) {
    case 'gemini': {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
        {
          method: 'POST',
          signal,
          headers: {
            'Content-Type': 'application/json',
            // Header rather than a query string, so the key never lands in a
            // proxy log or an error message containing the URL.
            'x-goog-api-key': process.env.GEMINI_API_KEY!.trim(),
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 700 },
          }),
        },
      )
      if (!response.ok) {
        console.error('[ai gemini]', response.status, (await response.text()).slice(0, 300))
        return null
      }
      const data = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') || null
    }

    case 'groq': {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY!.trim()}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          max_tokens: 700,
          messages: [
            { role: 'system', content: input.system },
            {
              role: 'user',
              content: `--- SERMON EXTRACTS ---\n${input.context}\n--- END EXTRACTS ---\n\nQuestion: ${input.question}`,
            },
          ],
        }),
      })
      if (!response.ok) {
        console.error('[ai groq]', response.status, (await response.text()).slice(0, 300))
        return null
      }
      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      return data.choices?.[0]?.message?.content ?? null
    }

    case 'ollama': {
      const base = process.env.OLLAMA_URL!.trim().replace(/\/$/, '')
      const response = await fetch(`${base}/api/generate`, {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          prompt,
          stream: false,
          options: { temperature: 0.2 },
        }),
      })
      if (!response.ok) {
        console.error('[ai ollama]', response.status)
        return null
      }
      const data = (await response.json()) as { response?: string }
      return data.response ?? null
    }

    default:
      return null
  }
}
