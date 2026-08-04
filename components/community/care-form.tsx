'use client'

import { CheckCircle2, Loader2, Lock, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { careKindHints, careKindLabels } from '@/lib/community-labels'
import { careKinds } from '@/lib/validations'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'
import type { CareKind } from '@prisma/client'

/**
 * A private message to the eldership.
 *
 * The reassurance text is not decoration — somebody about to type "I cannot
 * feed my children this week" needs to know, before they start, exactly who
 * will read it. So the audience is stated on the form, next to the field.
 */
export function CareForm({ defaultKind = 'QUESTION' }: { defaultKind?: CareKind }) {
  const [kind, setKind] = useState<CareKind>(defaultKind)
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/community/care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          subject: form.get('subject'),
          body: form.get('body'),
          anonymous,
          replyToEmail: form.get('replyToEmail') || undefined,
        }),
      })
      const result = (await response.json()) as ApiResult<unknown>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setSent(true)
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border-2 border-success/35 bg-success/5 p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h2 className="mt-5 text-2xl">We have it</h2>
        <p className="mx-auto mt-3 max-w-md text-pretty text-muted-foreground">
          A pastor will read this. If you left a way to reply, somebody will be in touch — usually
          within a few days. You have done the hard part by asking.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-7 inline-flex min-h-12 items-center rounded-xl border-2 border-primary/25 px-6 font-semibold text-primary transition-colors hover:bg-primary-soft"
        >
          Send another
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-7">
      {error && <Alert variant="error">{error}</Alert>}

      <fieldset>
        <legend className="mb-3 font-display text-base font-semibold text-foreground">
          What is this about?
        </legend>
        <div className="grid gap-3">
          {careKinds.map((value) => (
            <label
              key={value}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors',
                kind === value ? 'border-primary/40 bg-primary-soft/50' : 'border-border bg-card',
              )}
            >
              <input
                type="radio"
                name="kind"
                value={value}
                checked={kind === value}
                onChange={() => setKind(value)}
                className="mt-1 size-5 shrink-0"
              />
              <span>
                <span className="block font-display font-semibold text-foreground">
                  {careKindLabels[value]}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {careKindHints[value]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
          Subject
        </span>
        <Input name="subject" required maxLength={160} placeholder="In a few words" />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
          Tell us about it
        </span>
        <textarea
          name="body"
          rows={7}
          required
          maxLength={5000}
          className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />
      </label>

      <div className="rounded-2xl border-2 border-border bg-secondary/40 p-5">
        <p className="flex items-start gap-2 font-display font-semibold text-foreground">
          <Lock className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          Who reads this
        </p>
        <p className="mt-2 text-pretty text-sm text-muted-foreground">
          Only the pastors and administrators. It never appears on the feed, in your profile, or
          anywhere else on this site — not even to small-group leaders.
        </p>

        <label className="mt-4 flex items-start gap-3">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
            className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
          />
          <span>
            <span className="block font-display font-semibold text-foreground">
              Send this without my name
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              We store no link back to your account at all. If you want a reply, leave an address
              below — otherwise nobody will be able to answer you.
            </span>
          </span>
        </label>

        {anonymous && (
          <label className="mt-4 block">
            <span className="mb-1.5 block font-display text-sm font-semibold text-foreground">
              Reply to (optional)
            </span>
            <Input name="replyToEmail" type="email" maxLength={254} placeholder="you@example.com" />
          </label>
        )}
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex min-h-14 items-center gap-2 rounded-xl bg-primary px-8 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <Send className="size-5" aria-hidden />
        )}
        Send it
      </button>
    </form>
  )
}
