import { CloudOff } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'You are offline',
  robots: { index: false, follow: false },
}

/**
 * Shown by the service worker when a page is asked for and the network is
 * gone. Deliberately static and dependency-free — it has to render from the
 * cache with no server, no database and no session.
 */
export default function OfflinePage() {
  return (
    <div className="container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
      <span className="grid size-20 place-items-center rounded-3xl bg-secondary text-muted-foreground">
        <CloudOff className="size-10" aria-hidden />
      </span>

      <h1 className="mt-8 text-3xl sm:text-4xl">You are offline</h1>
      <p className="mt-4 max-w-md text-pretty text-lg text-muted-foreground">
        This page needs a connection. Nothing is lost — try again when you have signal.
      </p>

      <p className="mt-8 max-w-md text-pretty text-muted-foreground">
        If somebody needs prayer urgently and you cannot get online, call the church rather
        than waiting for a page to load.
      </p>
    </div>
  )
}
