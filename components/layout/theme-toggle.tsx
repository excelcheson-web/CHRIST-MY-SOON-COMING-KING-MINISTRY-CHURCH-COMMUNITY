'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

export type Theme = 'light' | 'dark' | 'system'

/** Shared with the no-flash script in app/layout.tsx — keep the key in step. */
export const THEME_KEY = 'cmsck-theme'

const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'Match my device', Icon: Monitor },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

/**
 * Applies a theme to the document.
 *
 * Exported because the no-flash script in the layout does the same thing in
 * plain JavaScript before React exists, and two copies of this logic that can
 * drift is how a theme toggle ends up flickering.
 */
export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  document.documentElement.classList.toggle('dark', dark)

  // Mobile browsers paint their own chrome with this, so a dark page with a
  // white address bar looks broken until it is updated too.
  // `--background` from styles/globals.css, converted out of HSL. Kept in step
  // with the boot script in app/layout.tsx.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#0c0d1d' : '#f8fafc')
}

/**
 * Light, dark, or whatever the phone is set to.
 *
 * Three states rather than two on purpose. A plain on/off switch has to pick
 * a side the first time somebody arrives, and picking wrong means a person who
 * keeps their phone in dark mode gets a white page at five in the morning.
 * "Match my device" is the default and the honest answer.
 */
export function ThemeToggle({
  className,
  variant = 'full',
}: {
  className?: string
  /**
   * `full` shows all three as a segmented control. `compact` is one button
   * that cycles, for the desktop header — which fits the brand, eight
   * navigation items and five account controls on one row and has no room
   * for a fourth control. See the note on breakpoints in tailwind.config.ts.
   */
  variant?: 'full' | 'compact'
}) {
  const [theme, setTheme] = useState<Theme>('system')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY) as Theme | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') setTheme(stored)
    setReady(true)
  }, [])

  // Follow the device while on "system" — somebody whose phone switches at
  // sunset should see this page switch with it, without reloading.
  useEffect(() => {
    if (theme !== 'system') return
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [theme])

  function choose(next: Theme) {
    setTheme(next)
    window.localStorage.setItem(THEME_KEY, next)
    applyTheme(next)
  }

  if (variant === 'compact') {
    // Cycles light → dark → match my device. The icon shows where you are and
    // the title says where the next press goes, so the third state is not
    // hidden behind guesswork.
    const current = options.find((option) => option.value === theme) ?? options[1]!
    const next = options[(options.indexOf(current) + 1) % options.length]!
    const Icon = current.Icon

    return (
      <button
        type="button"
        onClick={() => choose(next.value)}
        title={`Theme: ${current.label.toLowerCase()}. Switch to ${next.label.toLowerCase()}.`}
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-xl text-foreground transition-colors hover:bg-secondary',
          className,
        )}
      >
        <Icon className="size-5" aria-hidden />
        <span className="sr-only">
          Colour theme: {current.label}. Switch to {next.label}.
        </span>
      </button>
    )
  }

  return (
    <fieldset
      className={cn(
        'flex items-center gap-0.5 rounded-xl border-2 border-border bg-card p-1',
        className,
      )}
    >
      <legend className="sr-only">Colour theme</legend>

      {options.map(({ value, label, Icon }) => {
        // Before the stored choice is read, nothing is marked selected — a
        // button that says "pressed" and then changes its mind is worse than
        // one that waits a tick.
        const selected = ready && theme === value

        return (
          <button
            key={value}
            type="button"
            onClick={() => choose(value)}
            aria-pressed={selected}
            title={label}
            className={cn(
              'grid size-9 place-items-center rounded-lg transition-colors',
              selected
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            <span className="sr-only">{label}</span>
          </button>
        )
      })}
    </fieldset>
  )
}
