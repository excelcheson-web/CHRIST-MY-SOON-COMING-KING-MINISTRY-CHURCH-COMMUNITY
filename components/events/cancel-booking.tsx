'use client'

import { Loader2, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ApiResult } from '@/types'

export function CancelBookingButton({ token, slug }: { token: string; slug: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function cancel() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch(`/api/registrations/${token}`, { method: 'DELETE' })
      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not cancel that.' : result.error)
        return
      }

      router.refresh()
      router.push(`/events/${slug}`)
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      {confirming ? (
        <div className="space-y-3">
          <p className="text-pretty text-foreground">
            Give up your place? If anyone is waiting, it goes to them straight away.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="destructive" onClick={cancel} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : <XCircle aria-hidden />}
              Yes, cancel my place
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Keep it
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setConfirming(true)}>
          <XCircle aria-hidden />
          Cancel this booking
        </Button>
      )}
    </div>
  )
}
