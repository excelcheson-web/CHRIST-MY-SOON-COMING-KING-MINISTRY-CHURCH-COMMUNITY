'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { PasswordInput } from '@/components/auth/password-input'
import { StrengthMeter } from '@/components/auth/strength-meter'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

/**
 * Change your own password.
 *
 * `hasPassword` comes from the server, and it is the difference between
 * *changing* a password and *setting* a first one. An account that only ever
 * signed in with Google has no password to confirm, so asking for the current
 * one would be an unanswerable question standing between that person and ever
 * having a password at all. Every label on the form follows this flag so the
 * wording is never subtly wrong.
 *
 * The server makes the same decision independently from the stored record —
 * see the route. This prop shapes the form; it does not grant anything.
 */
export function ChangePassword({ hasPassword }: { hasPassword: boolean }) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const newPassword = watch('newPassword')

  async function onSubmit(values: ChangePasswordInput) {
    setSubmitError(null)
    setDone(false)

    try {
      const response = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Omitted entirely when there is nothing to confirm, rather than sent
          // as an empty string the server would have to interpret.
          ...(hasPassword ? { currentPassword: values.currentPassword } : {}),
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        }),
      })

      const result = (await response.json()) as ApiResult<{ changed: boolean }>

      if (!response.ok || !result.ok) {
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              setError(field as keyof ChangePasswordInput, {
                type: 'server',
                message: messages[0],
              })
            }
          }
        }
        setSubmitError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      // Never leave a typed password sitting in the DOM after success.
      reset({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setDone(true)
    } catch {
      setSubmitError('We could not reach the server. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <p className="text-muted-foreground">
        {hasPassword
          ? 'Choose something only you know. You will need it the next time you sign in.'
          : 'You sign in with Google at the moment. Setting a password lets you sign in either way.'}
      </p>

      {done && (
        <Alert variant="success">
          {hasPassword ? 'Your password has been changed.' : 'Your password has been set.'} Use it
          the next time you sign in.
        </Alert>
      )}

      {submitError && <Alert variant="error">{submitError}</Alert>}

      {hasPassword && (
        <Field
          id="current-password"
          label="Your current password"
          error={errors.currentPassword?.message}
        >
          {(props) => (
            <PasswordInput
              {...props}
              {...register('currentPassword')}
              autoComplete="current-password"
            />
          )}
        </Field>
      )}

      <Field
        id="new-password"
        label={hasPassword ? 'Your new password' : 'Choose a password'}
        hint="At least 8 characters, with a letter and a number."
        error={errors.newPassword?.message}
      >
        {(props) => (
          <>
            <PasswordInput {...props} {...register('newPassword')} autoComplete="new-password" />
            <StrengthMeter value={newPassword ?? ''} />
          </>
        )}
      </Field>

      <Field
        id="confirm-password"
        label="Type it again"
        error={errors.confirmPassword?.message}
      >
        {(props) => (
          <PasswordInput {...props} {...register('confirmPassword')} autoComplete="new-password" />
        )}
      </Field>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Saving…
          </>
        ) : (
          <>
            <KeyRound aria-hidden />
            {hasPassword ? 'Update password' : 'Set password'}
          </>
        )}
      </Button>
    </form>
  )
}
