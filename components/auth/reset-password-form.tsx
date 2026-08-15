'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'

import { PasswordInput } from '@/components/auth/password-input'
import { StrengthMeter } from '@/components/auth/strength-meter'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

/**
 * Choose a new password, using the token from the email.
 *
 * The token arrives as a prop from the page's `searchParams` rather than being
 * read here, and it is never rendered into the markup — only sent. A reset
 * token in the DOM is a reset token in a screenshot, a screen share, or a
 * browser extension.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [expired, setExpired] = useState(false)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: '', confirmPassword: '' },
  })

  const newPassword = watch('newPassword')

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, token }),
      })
      const result = (await response.json()) as ApiResult<{ reset: boolean }>

      if (!response.ok || !result.ok) {
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof ResetPasswordInput, { type: 'server', message: messages[0] })
            }
          }
        }
        // 410 means the link itself is finished — a new password will not help,
        // so the form is replaced with the way to get another link.
        if (response.status === 410) setExpired(true)
        setFormError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setDone(true)
      // Long enough to read the confirmation, short enough not to feel stuck.
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    }
  }

  if (done) {
    return (
      <div className="space-y-6">
        <Alert variant="success">
          Your password has been changed. Taking you to the sign-in page…
        </Alert>
        <Button asChild size="lg" block>
          <Link href="/login">Sign in now</Link>
        </Button>
      </div>
    )
  }

  if (expired) {
    return (
      <div className="space-y-6">
        <Alert variant="error">{formError}</Alert>
        <Button asChild size="lg" block>
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Field
        id={`${formId}-new`}
        label="Your new password"
        hint="At least 8 characters, with a letter and a number."
        error={errors.newPassword?.message}
      >
        {(props) => (
          <>
            <PasswordInput
              {...props}
              {...register('newPassword')}
              autoComplete="new-password"
              autoFocus
            />
            <StrengthMeter value={newPassword ?? ''} />
          </>
        )}
      </Field>

      <Field id={`${formId}-confirm`} label="Type it again" error={errors.confirmPassword?.message}>
        {(props) => (
          <PasswordInput {...props} {...register('confirmPassword')} autoComplete="new-password" />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          <>
            <KeyRound aria-hidden />
            Set my new password
          </>
        )}
      </Button>
    </form>
  )
}
