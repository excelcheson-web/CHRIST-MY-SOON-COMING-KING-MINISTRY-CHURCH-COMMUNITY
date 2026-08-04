'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'

type Props = Omit<ButtonProps, 'onClick'> & {
  /** Where to go next. */
  href: string
  /** Which funnel flag to record first. Omit to only start the journey. */
  step?: 'gospel' | 'prayer'
  /** Create the decision record before moving on (used on the landing page). */
  start?: boolean
  children: ReactNode
}

/**
 * Moves someone to the next stage and quietly records that they got there.
 *
 * The tracking call is deliberately best-effort: if it fails, times out, or
 * there is no database at all, we still navigate. Nobody is ever blocked from
 * reaching the prayer by an analytics problem.
 */
export function JourneyButton({ href, step, start, children, ...props }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function go() {
    setBusy(true)

    const calls: Promise<unknown>[] = []
    if (start) {
      calls.push(
        fetch('/api/salvation/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision: 'SALVATION' }),
        }).catch(() => null),
      )
    }
    if (step) {
      calls.push(
        fetch('/api/salvation/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step }),
        }).catch(() => null),
      )
    }

    // Never let a slow network hold someone on the page.
    await Promise.race([
      Promise.all(calls),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ])

    router.push(href)
  }

  return (
    <Button {...props} onClick={go} disabled={busy || props.disabled}>
      {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  )
}
