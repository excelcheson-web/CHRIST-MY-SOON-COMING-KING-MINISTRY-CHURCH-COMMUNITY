import type { ReactNode } from 'react'

import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'

/** Header + content + footer. Shared by the public pages and the member area. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main id="main-content" className="flex-1 focus:outline-none" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  )
}
