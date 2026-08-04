'use client'

import { Check, Copy, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
import { useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

type Stage = 'idle' | 'scanning' | 'codes'

export function TwoFactorSetup({
  enabled,
  enabledAt,
  recoveryRemaining,
}: {
  enabled: boolean
  enabledAt: string | null
  recoveryRemaining: number
}) {
  const [stage, setStage] = useState<Stage>('idle')
  const [qr, setQr] = useState<string | null>(null)
  const [manualKey, setManualKey] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function call(payload: object) {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/account/two-factor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as ApiResult<Record<string, unknown>>
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return null
      }
      return result.data
    } catch {
      setError('We could not reach the server. Please try again.')
      return null
    } finally {
      setBusy(false)
    }
  }

  async function begin() {
    const data = await call({ action: 'begin' })
    if (!data) return

    // Render the QR client-side so the secret never travels to an image host.
    const { default: QRCode } = await import('qrcode')
    setQr(await QRCode.toDataURL(String(data.uri), { margin: 2, width: 320 }))
    setManualKey(String(data.secret))
    setStage('scanning')
  }

  async function confirm() {
    const data = await call({ action: 'confirm', code })
    if (!data) return
    setRecoveryCodes(data.recoveryCodes as string[])
    setStage('codes')
    setCode('')
  }

  async function disable() {
    if (!confirm2fa('Turn off two-factor authentication for your account?')) return
    const data = await call({ action: 'disable', password })
    if (!data) return
    window.location.reload()
  }

  async function regenerate() {
    if (!confirm2fa('Replace your recovery codes? The old ones stop working immediately.')) return
    const data = await call({ action: 'regenerate', password })
    if (!data) return
    setRecoveryCodes(data.recoveryCodes as string[])
    setPassword('')
  }

  // Named to avoid shadowing the `confirm` action above.
  const confirm2fa = (message: string) => window.confirm(message)

  function copyCodes() {
    if (!recoveryCodes) return
    void navigator.clipboard.writeText(recoveryCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  // --- Freshly issued recovery codes ---------------------------------------
  if (recoveryCodes) {
    return (
      <div className="space-y-5">
        <Alert variant="success">
          Two-factor authentication is on. <strong>Save these recovery codes now</strong> — this is
          the only time they can be shown.
        </Alert>

        <div className="rounded-2xl border-2 border-border bg-card p-6">
          <ul className="grid gap-2 font-mono text-lg font-bold text-foreground sm:grid-cols-2">
            {recoveryCodes.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>

        <p className="text-pretty text-muted-foreground">
          Each one works once, and only if your phone is unavailable. Print them, or put them
          somewhere only you and one trusted person can reach.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button onClick={copyCodes} variant="outline">
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? 'Copied' : 'Copy all'}
          </Button>
          <Button onClick={() => window.location.reload()}>I have saved them</Button>
        </div>
      </div>
    )
  }

  // --- Scanning stage -------------------------------------------------------
  if (stage === 'scanning') {
    return (
      <div className="space-y-5">
        {error && <Alert variant="error">{error}</Alert>}

        <ol className="space-y-5">
          <li>
            <p className="font-display font-bold text-foreground">
              1. Open an authenticator app
            </p>
            <p className="mt-1 text-pretty text-muted-foreground">
              Google Authenticator, Microsoft Authenticator, Authy and 1Password all work.
            </p>
          </li>

          <li>
            <p className="font-display font-bold text-foreground">2. Scan this</p>
            {qr && (
              <div className="mt-3 inline-block rounded-2xl bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI generated in the browser */}
                <img src={qr} alt="" width={320} height={320} className="block size-56" />
              </div>
            )}
            {manualKey && (
              <p className="mt-3 text-pretty text-sm text-muted-foreground">
                Cannot scan? Type this key instead:{' '}
                <code className="select-all break-all font-bold text-foreground">{manualKey}</code>
              </p>
            )}
          </li>

          <li>
            <label htmlFor="confirm-code" className="font-display font-bold text-foreground">
              3. Type the six-digit code it shows
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              This proves the app is set up before we switch anything on.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Input
                id="confirm-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                className="text-center font-display text-2xl font-bold tracking-[0.3em] sm:max-w-[14rem]"
              />
              <Button onClick={confirm} disabled={busy || code.trim().length < 6} size="lg">
                {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
                Turn it on
              </Button>
            </div>
          </li>
        </ol>

        <Button variant="ghost" onClick={() => setStage('idle')} disabled={busy}>
          Cancel
        </Button>
      </div>
    )
  }

  // --- Already on -----------------------------------------------------------
  if (enabled) {
    return (
      <div className="space-y-6">
        {error && <Alert variant="error">{error}</Alert>}

        <Alert variant="success">
          <ShieldCheck aria-hidden />
          Two-factor authentication is on
          {enabledAt &&
            ` — since ${new Date(enabledAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}`}
          .
        </Alert>

        <p className="text-pretty text-muted-foreground">
          You have <strong>{recoveryRemaining}</strong> unused recovery{' '}
          {recoveryRemaining === 1 ? 'code' : 'codes'} left.
          {recoveryRemaining <= 2 && ' That is running low — generate a fresh set.'}
        </p>

        <div className="rounded-2xl border-2 border-border bg-card p-5">
          <label htmlFor="confirm-password" className="font-display font-semibold text-foreground">
            Confirm your password to change anything
          </label>
          <p className="mt-1 text-sm text-muted-foreground">
            So that an unattended, signed-in laptop is not enough to weaken your account.
          </p>
          <Input
            id="confirm-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className="mt-3"
          />

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={regenerate} disabled={busy || !password}>
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              New recovery codes
            </Button>
            <Button variant="ghost" onClick={disable} disabled={busy || !password}>
              <ShieldOff className="text-destructive" aria-hidden />
              Turn off
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // --- Off ------------------------------------------------------------------
  return (
    <div className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <p className="text-pretty text-muted-foreground">
        With this on, signing in needs your password <em>and</em> a code from your phone. It is the
        single most effective thing you can do to protect the accounts that can read private prayer
        requests and members&apos; details.
      </p>

      <Button onClick={begin} disabled={busy} size="lg">
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ShieldCheck aria-hidden />}
        Set up two-factor authentication
      </Button>
    </div>
  )
}
