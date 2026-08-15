'use client'

import Script from 'next/script'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * The Cloudflare Turnstile widget.
 *
 * Renders nothing at all when no site key is configured, so every form can
 * include it unconditionally and a developer without a Cloudflare account sees
 * no difference. `lib/turnstile.ts` makes the matching decision on the server.
 *
 * ## Why it renders the widget by hand
 *
 * Turnstile's automatic mode scans the DOM for `.cf-turnstile` when its script
 * loads. That works on a static page and is unreliable in an app that mounts
 * forms after navigation — the script has already run and never looks again.
 * Explicit rendering means this component owns the lifecycle: it draws when the
 * script is ready and the container exists, and removes the widget on unmount
 * so a form opened, closed and reopened does not leak an orphan.
 *
 * ## The token
 *
 * Short-lived, single-use, and issued to the browser. The parent form sends it
 * with the submission and the server checks it exactly once. `onVerify(null)`
 * fires on expiry or error so the form knows the token it holds is worthless
 * and can ask for another rather than submitting something already dead.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          action?: string
        },
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

/**
 * Read here rather than passed in.
 *
 * `NEXT_PUBLIC_` variables are inlined into the client bundle at build time, so
 * this is available in the browser without a server component handing it down —
 * which spares five separate forms from drilling the same prop through. Empty
 * string means "not configured", and the component renders nothing.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ''

/** Whether the check is switched on. Lets a form skip its own "please tick" guard. */
export const turnstileEnabled = SITE_KEY.length > 0

export function TurnstileWidget({
  onVerify,
  action,
  resetSignal = 0,
}: {
  onVerify: (token: string | null) => void
  /** Labels the challenge in Cloudflare's analytics, e.g. "register". */
  action?: string
  /**
   * Increment to throw away the current token and get a fresh one.
   *
   * Needed because a token is spent the moment the server checks it, and the
   * sign-in form submits **twice** when two-factor is on — once for the
   * password, once for the code. Without a reset the second submission would
   * arrive carrying a token Cloudflare has already seen, and a member with 2FA
   * would be locked out of their own account by the anti-bot check.
   */
  resetSignal?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptReady, setScriptReady] = useState(false)
  const instanceId = useId()

  /*
   * Held in a ref so the render effect below does not depend on it.
   * `onVerify` is usually an inline arrow function, which is a new value on
   * every parent render — as a dependency it would tear down and redraw the
   * widget continuously, and the visitor would watch it flicker forever.
   */
  const onVerifyRef = useRef(onVerify)
  useEffect(() => {
    onVerifyRef.current = onVerify
  }, [onVerify])

  const handleToken = useCallback((token: string | null) => {
    onVerifyRef.current(token)
  }, [])

  useEffect(() => {
    if (!SITE_KEY || !scriptReady || !containerRef.current) return
    if (widgetIdRef.current) return
    const api = window.turnstile
    if (!api) return

    widgetIdRef.current = api.render(containerRef.current, {
      sitekey: SITE_KEY,
      action,
      // Follows the page's light/dark choice rather than fighting it.
      theme: 'auto',
      callback: (token) => handleToken(token),
      'expired-callback': () => handleToken(null),
      'error-callback': () => handleToken(null),
    })

    return () => {
      if (!widgetIdRef.current) return
      try {
        api.remove(widgetIdRef.current)
      } catch {
        // Already gone — the script may have been torn down first. Nothing to do.
      }
      widgetIdRef.current = null
    }
  }, [scriptReady, action, handleToken, instanceId])

  /*
   * Throw the spent token away and ask for another.
   *
   * `onVerify(null)` fires first and synchronously: between the reset and
   * Cloudflare's callback the parent form holds nothing valid, and it must know
   * that rather than submitting a token that has already been used.
   */
  useEffect(() => {
    if (resetSignal === 0 || !widgetIdRef.current) return
    handleToken(null)
    try {
      window.turnstile?.reset(widgetIdRef.current)
    } catch {
      // Widget already torn down; the next mount issues a fresh token anyway.
    }
  }, [resetSignal, handleToken])

  if (!SITE_KEY) return null

  return (
    <div>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onLoad={() => setScriptReady(true)}
      />
      <div ref={containerRef} />
    </div>
  )
}
