'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const tabs = [
  { href: '/prayer', label: 'Prayer Wall', emoji: '🙏' },
  { href: '/prayer/submit', label: 'Ask for Prayer', emoji: '✍️' },
  { href: '/prayer/groups', label: 'Prayer Groups', emoji: '👥' },
  { href: '/prayer/testimonies', label: 'Testimonies', emoji: '🎉' },
]

function isActive(pathname: string, href: string) {
  return href === '/prayer' ? pathname === '/prayer' : pathname.startsWith(href)
}

/** Sub-navigation for the Prayer section — same four tabs on every page. */
export function PrayerTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label="Prayer sections" className="border-b border-border bg-secondary/30">
      <div className="container">
        <ul className="-mb-px flex gap-1 overflow-x-auto py-3">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <li key={tab.href} className="shrink-0">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-12 items-center gap-2 rounded-xl px-4 font-display font-semibold transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground shadow-soft'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <span aria-hidden>{tab.emoji}</span>
                  {tab.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
