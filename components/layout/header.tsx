'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { navIcons } from '@/components/icons'
import { AuthNav } from '@/components/layout/auth-nav'
import { BrandLink } from '@/components/layout/brand'
import { mainNav, secondaryNav } from '@/lib/site'
import { cn } from '@/lib/utils'

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => setOpen(false), [])

  // Navigating away should always leave the drawer closed.
  useEffect(() => close(), [pathname, close])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      toggleRef.current?.focus()
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus()

    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full glass transition-shadow duration-300',
        scrolled ? 'border-b border-border shadow-soft' : 'border-b border-transparent',
      )}
    >
      <div className="container flex h-20 items-center justify-between gap-4">
        <BrandLink />

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-0.5 2xl:gap-1">
            {mainNav.map((item) => {
              const Icon = navIcons[item.icon]
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      // Compact padding: eight items plus the brand and account
                      // controls have to share one row at xl. `whitespace-nowrap`
                      // matters — without it "Follow Jesus" wraps to two lines
                      // and the button grows a head taller than its neighbours.
                      'group relative flex h-12 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 2xl:px-3',
                      'font-display text-[0.95rem] font-semibold transition-colors duration-200',
                      item.emphasis
                        ? 'ml-1 bg-accent-gradient text-accent-foreground shadow-soft hover:brightness-105'
                        : active
                          ? 'bg-primary-soft text-primary'
                          : 'text-foreground/75 hover:bg-secondary hover:text-foreground',
                    )}
                  >
                    {/* Icons are the first thing to go when the row gets tight:
                        the label is what people actually read. They come back
                        at 2xl, where there is room for both. */}
                    <Icon aria-hidden className="hidden size-5 2xl:block" />
                    {item.label}
                    {!item.emphasis && (
                      <span
                        aria-hidden
                        className={cn(
                          'absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-accent-gradient transition-transform duration-300',
                          active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100',
                        )}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="hidden xl:block">
          <AuthNav />
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className={cn(
            'flex size-12 items-center justify-center rounded-xl border-2 border-border',
            'bg-card text-foreground transition-colors hover:border-primary/40 hover:bg-secondary xl:hidden',
          )}
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
        </button>
      </div>

      {/* Mobile drawer — full-width rows, every target well over 48px. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        hidden={!open}
        className="border-t border-border bg-background xl:hidden"
      >
        <div className="container max-h-[calc(100dvh-5rem)] space-y-6 overflow-y-auto py-6">
          <nav aria-label="Main (mobile)">
            <ul className="space-y-2">
              {mainNav.map((item) => {
                const Icon = navIcons[item.icon]
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-4 rounded-2xl border-2 p-4 transition-colors',
                        item.emphasis
                          ? 'border-accent/40 bg-accent-soft'
                          : active
                            ? 'border-primary/30 bg-primary-soft'
                            : 'border-border bg-card hover:border-primary/25 hover:bg-secondary',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-12 shrink-0 place-items-center rounded-xl',
                          item.emphasis
                            ? 'bg-accent-gradient text-accent-foreground'
                            : active
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-primary',
                        )}
                      >
                        <Icon aria-hidden className="size-6" />
                      </span>
                      <span className="flex flex-col">
                        <span className="font-display text-lg font-bold text-foreground">
                          {item.label}
                        </span>
                        <span className="text-sm text-muted-foreground">{item.hint}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Everything the desktop bar had no room for. Nothing on this site
              should be reachable on one device and not another. */}
          <nav aria-label="More pages" className="border-t border-border pt-6">
            <ul className="space-y-2">
              {secondaryNav.map((item) => {
                const Icon = navIcons[item.icon]
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-4 rounded-2xl border-2 p-4 transition-colors',
                        active
                          ? 'border-primary/30 bg-primary-soft'
                          : 'border-border bg-card hover:border-primary/25 hover:bg-secondary',
                      )}
                    >
                      <span
                        className={cn(
                          'grid size-12 shrink-0 place-items-center rounded-xl',
                          active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary',
                        )}
                      >
                        <Icon aria-hidden className="size-6" />
                      </span>
                      <span className="flex flex-col">
                        <span className="font-display text-lg font-bold text-foreground">
                          {item.label}
                        </span>
                        <span className="text-sm text-muted-foreground">{item.hint}</span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="border-t border-border pt-6">
            <AuthNav variant="drawer" onNavigate={close} />
          </div>
        </div>
      </div>
    </header>
  )
}
