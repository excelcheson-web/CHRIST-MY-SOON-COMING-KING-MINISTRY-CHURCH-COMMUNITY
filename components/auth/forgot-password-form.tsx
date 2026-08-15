'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, MailCheck, Send } from 'lucide-react'
import Link from 'next/link'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'

import { TurnstileWidget } from '@/components/turnstile-widget'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

export function ForgotPasswordForm() {
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onBlur',
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, turnstileToken }),
      })
      const result = (await response.json()) as ApiResult<{ sent: boolean }>

      if (!response.ok || !result.ok) {
        setFormError(result.ok ? 'Something went wrong.' : result.error)
        setTurnstileReset((count) => count + 1)
        return
      }

      setSent(true)
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
      setTurnstileReset((count) => count + 1)
    }
  }

  /*
   * The confirmation says "if there is an account" on purpose.
   *
   * The server answers identically whether or not the address is registered —
   * otherwise this form would be a way to test who attends this church, one
   * address at a time. The wording has to carry that same ambiguity, or the
   * page would undo what the endpoint is careful to protect.
   */
  if (sent) {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          <span>
            If there is an account for <strong>{getValues('email')}</strong>, a link to choose a new
            password is on its way. It works once and expires in an hour.
          </span>
        </Alert>

        <div className="rounded-2xl border-2 border-border bg-secondary/30 p-5">
          <p className="flex items-center gap-2 font-display font-bold text-foreground">
            <MailCheck className="size-5 text-primary" aria-hidden />
            Nothing arrived?
          </p>
          <ul className="mt-2 space-y-1.5 text-pretty text-muted-foreground">
            <li>Give it a couple of minutes — it is usually quicker.</li>
            <li>Check the spam or junk folder.</li>
            <li>
              If you signed up with Google, you have no password to reset — use{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Continue with Google
              </Link>{' '}
              instead.
            </li>
          </ul>
        </div>

        <Button asChild variant="outline" size="lg" block>
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Field
        id={`${formId}-email`}
        label="Your email address"
        hint="The one you signed up with."
        error={errors.email?.message}
      >
        {(props) => (
          <Input
            {...props}
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            enterKeyHint="send"
            autoFocus
          />
        )}
      </Field>

      <TurnstileWidget
        onVerify={setTurnstileToken}
        action="forgot-password"
        resetSignal={turnstileReset}
      />

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden />
            Send me a reset link
          </>
        )}
      </Button>

      <p className="text-center text-muted-foreground">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
