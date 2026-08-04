import type { ReactNode } from 'react'

import { SiteShell } from '@/components/layout/site-shell'

/** Signed-in area (dashboard, admin). Same chrome as the public site — one
 *  navigation model for everyone, which is the whole point of Phase One. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <SiteShell>{children}</SiteShell>
}
