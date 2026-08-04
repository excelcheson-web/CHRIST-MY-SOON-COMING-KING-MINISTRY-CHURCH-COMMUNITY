'use client'

import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'

/** Chrome's install event, which TypeScript's DOM lib does not describe. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'cmsck-install-dismissed'

/**
 * Registers the service worker, and offers to install the app.
 *
 * ## Why the banner waits
 *
 * Browsers fire `beforeinstallprompt` the moment they decide a site is
 * installable, which can be seconds after a first-ever visit. Asking somebody
 * to install an app they have not looked at yet is the mobile-web equivalent
 * of a cookie wall — most people dismiss it, and a dismissal is remembered by
 * the browser for a long time. So the offer is held back until the second
 * visit, when there is some evidence the person actually wants this.
 *
 * A dismissal is remembered here too, so it is asked once and not again.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<InstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  // --- Service worker ------------------------------------------------------
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    // Registered after load so it never competes with the first paint for
    // bandwidth on a slow connection.
    const register = () => {
      void navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[pwa] service worker did not register', error)
      })
    }
    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  // --- Install offer -------------------------------------------------------
  useEffect(() => {
    function onPrompt(raw: Event) {
      // Stop Chrome showing its own mini-infobar so ours is the only ask.
      raw.preventDefault()
      setEvent(raw as InstallPromptEvent)

      if (window.localStorage.getItem(DISMISSED_KEY)) return

      const visits = Number(window.localStorage.getItem('cmsck-visits') ?? '0') + 1
      window.localStorage.setItem('cmsck-visits', String(visits))
      if (visits >= 2) setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  function dismiss() {
    setVisible(false)
    window.localStorage.setItem(DISMISSED_KEY, '1')
  }

  async function install() {
    if (!event) return
    await event.prompt()
    await event.userChoice
    setVisible(false)
    window.localStorage.setItem(DISMISSED_KEY, '1')
  }

  if (!visible || !event) return null

  return (
    <div
      role="dialog"
      aria-label="Install this app"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border-2 border-border bg-card p-5 shadow-lifted sm:left-auto sm:right-6 sm:mx-0"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Download className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground">Add to your home screen</p>
          <p className="mt-1 text-pretty text-sm text-muted-foreground">
            Opens like an app, with no address bar — and it still works when the signal
            drops.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="flex min-h-11 items-center rounded-xl bg-primary px-5 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="flex min-h-11 items-center rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </div>
  )
}
