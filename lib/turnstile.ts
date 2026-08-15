import 'server-only'

import { clientIp } from '@/lib/rate-limit'

/**
 * Cloudflare Turnstile — the "confirm you are human" check on public forms.
 *
 * ## Where it is used, and where it deliberately is not
 *
 * Only on the handful of endpoints a stranger can write through: registration,
 * sign-in, prayer requests, testimonies and the salvation contact form. It is
 * **not** on any page a visitor merely reads.
 *
 * That boundary is not a performance preference, it is the whole SEO position.
 * Googlebot cannot solve a challenge. A check in front of the public pages
 * would take the site out of the search index within weeks and make the
 * sitemap, the structured data and the rest of it worthless. If somebody later
 * asks for "the human check on the whole site", this paragraph is the answer.
 *
 * ## Off unless configured
 *
 * With no keys set, `isTurnstileConfigured` is false, the widget renders
 * nothing, and verification passes. That matches how Google sign-in and the AI
 * provider already behave here, and it means a developer can run the site
 * without a Cloudflare account.
 *
 * The trade-off is real and worth stating: **a missing secret in production is
 * an open door, not a locked one.** It fails open because the alternative —
 * failing closed — would mean one unset variable silently blocking every
 * registration and prayer request on the site, with no error anybody would
 * think to look for. A church losing prayer requests in silence is worse than
 * a church without a bot check. `verifyTurnstile` logs loudly when only one of
 * the two keys is present, which is the misconfiguration that actually happens.
 */

const VERIFY_ENDPOINT = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** The public key. Safe in the browser — that is what it is for. */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ''

const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY?.trim() ?? ''

/**
 * Both halves have to be present.
 *
 * A site key without a secret would render a widget whose answer nothing ever
 * checks — a padlock painted on a door, which is worse than no padlock because
 * it invites someone to stop thinking about the door.
 */
export const isTurnstileConfigured = Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY)

export type TurnstileResult = { ok: true } | { ok: false; reason: string }

/**
 * Verifies a token with Cloudflare.
 *
 * Tokens are single-use and expire after five minutes, so this must be called
 * exactly once per submission, server-side. Calling it twice on the same token
 * fails the second time — which is the point, and is what stops a captured
 * token being replayed.
 */
export async function verifyTurnstile(
  token: unknown,
  headers: Headers,
): Promise<TurnstileResult> {
  if (!isTurnstileConfigured) {
    // Only one key set is a mistake somebody made, not a decision. Say so.
    if (TURNSTILE_SITE_KEY || TURNSTILE_SECRET_KEY) {
      console.error(
        '[turnstile] only one of NEXT_PUBLIC_TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY is set — the human check is OFF',
      )
    }
    return { ok: true }
  }

  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, reason: 'Please complete the human check below.' }
  }

  /*
   * Cloudflare expects form encoding here, not JSON.
   *
   * `remoteip` is optional and sent because it lets Cloudflare weigh the
   * request against what it knows about that address. It is the same value the
   * rate limiter keys on, so the two agree about who is asking.
   */
  const form = new URLSearchParams({
    secret: TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: clientIp(headers),
  })

  try {
    /*
     * A hard timeout, because this sits in front of registration and prayer
     * requests. If Cloudflare is slow or unreachable, a visitor must not be
     * left watching a spinner — see the catch below for what happens then.
     */
    const response = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      body: form,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })

    const outcome = (await response.json()) as {
      success?: boolean
      'error-codes'?: string[]
    }

    if (outcome.success) return { ok: true }

    const codes = outcome['error-codes'] ?? []
    console.warn('[turnstile] rejected:', codes.join(', ') || 'no reason given')

    /*
     * An expired or already-spent token is the common, innocent case: a form
     * left open over lunch, or a second submit. It gets an instruction rather
     * than an accusation, because the person is almost always genuine.
     */
    if (codes.includes('timeout-or-duplicate')) {
      return { ok: false, reason: 'That check has expired. Please tick the box again.' }
    }

    return { ok: false, reason: 'We could not confirm that. Please try the human check again.' }
  } catch (error) {
    /*
     * Cloudflare unreachable. Fails **open**, deliberately and loudly.
     *
     * The alternative is that an outage at a third party stops a person in
     * distress sending a prayer request. Weighed against a bot getting through
     * during the same window, this is the right way round for this site — but
     * it is a judgement, so it is logged at error level rather than swallowed.
     */
    console.error('[turnstile] verification unreachable, allowing through:', error)
    return { ok: true }
  }
}
