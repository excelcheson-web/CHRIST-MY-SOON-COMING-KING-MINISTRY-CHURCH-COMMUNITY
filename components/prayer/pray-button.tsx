'use client'

import { HandHeart, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

/**
 * "I prayed for this".
 *
 * Optimistic, and safe to press twice — the server keys on one row per person
 * per request, so a double tap, a refresh or a second tab all count once.
 */
export function PrayButton({
  requestId,
  initialCount,
  initialPrayed,
  className,
}: {
  requestId: string
  initialCount: number
  initialPrayed: boolean
  className?: string
}) {
  const [count, setCount] = useState(initialCount)
  const [prayed, setPrayed] = useState(initialPrayed)
  const [busy, setBusy] = useState(false)

  async function pray() {
    if (prayed || busy) return

    setBusy(true)
    setPrayed(true)
    setCount((value) => value + 1)

    try {
      const response = await fetch(`/api/prayer/requests/${requestId}/pray`, { method: 'POST' })
      const result = (await response.json()) as ApiResult<{ prayerCount: number; hasPrayed: boolean }>

      if (result.ok) {
        setCount(result.data.prayerCount)
        setPrayed(result.data.hasPrayed)
      } else {
        setPrayed(false)
        setCount((value) => Math.max(0, value - 1))
      }
    } catch {
      setPrayed(false)
      setCount((value) => Math.max(0, value - 1))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <Button
        onClick={pray}
        disabled={prayed || busy}
        variant={prayed ? 'outline' : 'default'}
        aria-pressed={prayed}
        className={prayed ? 'border-success/40 text-success' : undefined}
      >
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <HandHeart aria-hidden />}
        {prayed ? 'You prayed 🙏' : 'I prayed for this'}
      </Button>

      <p className="text-sm font-semibold text-muted-foreground">
        {count === 0
          ? 'Be the first to pray'
          : `${count} ${count === 1 ? 'person has' : 'people have'} prayed`}
      </p>
    </div>
  )
}
