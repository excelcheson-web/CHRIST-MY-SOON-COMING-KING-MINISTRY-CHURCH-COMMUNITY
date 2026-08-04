'use client'

import { Camera, CameraOff, CheckCircle2, Keyboard, Loader2, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

type CheckInResult = {
  name: string
  guests: number
  seats: number
  status: string
  accessibilityNeeds: string | null
  dietaryNotes: string | null
  alreadyCheckedIn: boolean
  checkedInAt: string
}

type Outcome =
  | { kind: 'ok'; result: CheckInResult }
  | { kind: 'error'; message: string }

// BarcodeDetector is Chrome/Android only — Safari and Firefox do not have it.
// That is exactly why manual entry is a first-class path here, not a fallback
// buried behind a link.
type BarcodeDetectorLike = {
  detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>
}

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike
  }
}

export function CheckInScanner({ slug }: { slug: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastValueRef = useRef<string>('')

  const [scanning, setScanning] = useState(false)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [manual, setManual] = useState('')
  const [checkedCount, setCheckedCount] = useState(0)

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  const submit = useCallback(
    async (value: string, method: 'QR' | 'MANUAL') => {
      if (!value.trim() || busy) return
      setBusy(true)

      try {
        const response = await fetch(`/api/events/${slug}/check-in`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value, method }),
        })
        const result = (await response.json()) as ApiResult<CheckInResult>

        if (!response.ok || !result.ok) {
          setOutcome({ kind: 'error', message: result.ok ? 'Something went wrong.' : result.error })
          return
        }

        setOutcome({ kind: 'ok', result: result.data })
        if (!result.data.alreadyCheckedIn) setCheckedCount((n) => n + 1)
        setManual('')
      } catch {
        setOutcome({ kind: 'error', message: 'We could not reach the server. Try the code by hand.' })
      } finally {
        setBusy(false)
      }
    },
    [slug, busy],
  )

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => stop, [stop])

  async function start() {
    setOutcome(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
    } catch {
      setOutcome({
        kind: 'error',
        message: 'We could not open the camera. Type the six-character code instead.',
      })
    }
  }

  // Poll the video for a QR roughly four times a second.
  useEffect(() => {
    if (!scanning || !window.BarcodeDetector) return

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
    let cancelled = false

    const tick = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) return
      try {
        const codes = await detector.detect(videoRef.current)
        const value = codes[0]?.rawValue
        // Ignore the same code repeating while the phone is still pointed at it.
        if (value && value !== lastValueRef.current) {
          lastValueRef.current = value
          await submit(value, 'QR')
          setTimeout(() => { lastValueRef.current = '' }, 2500)
        }
      } catch {
        // A dropped frame is not worth reporting.
      }
    }

    const timer = setInterval(tick, 250)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [scanning, submit])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-border bg-card p-5">
        <p className="font-display font-bold text-foreground">
          Checked in this session:{' '}
          <span className="text-2xl text-primary">{checkedCount}</span>
        </p>
        {scanning ? (
          <Button variant="outline" onClick={stop}>
            <CameraOff aria-hidden />
            Stop camera
          </Button>
        ) : (
          supported && (
            <Button onClick={start}>
              <Camera aria-hidden />
              Scan with camera
            </Button>
          )
        )}
      </div>

      {supported === false && (
        <Alert variant="info">
          This browser cannot use the camera scanner (it works in Chrome on Android). Type the
          six-character code from the person&apos;s pass instead — it does exactly the same thing.
        </Alert>
      )}

      {scanning && (
        <div className="overflow-hidden rounded-3xl border-2 border-primary/30 bg-black">
          <video
            ref={videoRef}
            className="aspect-[4/3] w-full object-cover"
            muted
            playsInline
            aria-label="Camera preview for scanning passes"
          />
        </div>
      )}

      <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
        <label
          htmlFor="manual-code"
          className="flex items-center gap-2 font-display text-base font-semibold text-foreground"
        >
          <Keyboard className="size-5 text-accent-ink" aria-hidden />
          Type the code
        </label>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Six characters, printed under the QR on their pass.
        </p>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void submit(manual, 'MANUAL')
          }}
          className="mt-4 flex flex-col gap-3 sm:flex-row"
        >
          <input
            id="manual-code"
            value={manual}
            onChange={(event) => setManual(event.target.value.toUpperCase())}
            maxLength={40}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC123"
            className="h-14 flex-1 rounded-xl border-2 border-input bg-card px-4 text-center font-display text-2xl font-bold tracking-[0.3em] text-foreground"
          />
          <Button type="submit" size="lg" disabled={busy || !manual.trim()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Check in
          </Button>
        </form>
      </div>

      {outcome && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'rounded-3xl border-2 p-6 sm:p-8',
            outcome.kind === 'error'
              ? 'border-destructive/40 bg-destructive/10'
              : outcome.result.alreadyCheckedIn
                ? 'border-accent/40 bg-accent-soft'
                : 'border-success/40 bg-success/10',
          )}
        >
          {outcome.kind === 'error' ? (
            <p className="flex items-center gap-3 font-display text-xl font-bold text-destructive">
              <XCircle className="size-7 shrink-0" aria-hidden />
              {outcome.message}
            </p>
          ) : (
            <>
              <p
                className={cn(
                  'flex items-center gap-3 font-display text-2xl font-extrabold',
                  outcome.result.alreadyCheckedIn ? 'text-accent-ink' : 'text-success',
                )}
              >
                <CheckCircle2 className="size-8 shrink-0" aria-hidden />
                {outcome.result.name}
              </p>

              <p className="mt-3 text-lg font-semibold text-foreground">
                {outcome.result.seats} {outcome.result.seats === 1 ? 'person' : 'people'}
                {outcome.result.guests > 0 && ` (plus ${outcome.result.guests})`}
              </p>

              {outcome.result.alreadyCheckedIn && (
                <p className="mt-2 font-semibold text-accent-ink">
                  Already checked in at{' '}
                  {new Date(outcome.result.checkedInAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  — wave them through.
                </p>
              )}

              {outcome.result.status === 'WAITLISTED' && (
                <p className="mt-2 font-bold text-destructive">
                  On the waitlist — not confirmed. Check with the organiser first.
                </p>
              )}

              {outcome.result.accessibilityNeeds && (
                <p className="mt-4 rounded-xl bg-card p-4 text-pretty">
                  <strong className="font-display">Access:</strong>{' '}
                  {outcome.result.accessibilityNeeds}
                </p>
              )}

              {outcome.result.dietaryNotes && (
                <p className="mt-3 rounded-xl bg-card p-4 text-pretty">
                  <strong className="font-display">Dietary:</strong> {outcome.result.dietaryNotes}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
