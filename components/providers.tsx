'use client'

import { SessionProvider } from 'next-auth/react'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    // Public pages stay statically rendered; the session is fetched once on the
    // client and shared by every component that needs it.
    <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
  )
}
