import type { ReactNode } from 'react'

import { PrayerTabs } from '@/components/prayer/prayer-tabs'

export default function PrayerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PrayerTabs />
      {children}
    </>
  )
}
