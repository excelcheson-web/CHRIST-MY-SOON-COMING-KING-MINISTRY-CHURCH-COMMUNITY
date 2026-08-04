'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, LogIn, ShieldCheck } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'

import { PasswordInput } from '@/components/auth/password-input'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { loginSchema, type LoginInput } from '@/lib/validations'

/** Only allow same-origin, absolute-path redirects back from ?callbackUrl. */
function safeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(
    searchParams.get('error') ? 'We could not sign you in. Please try again.' : null,
  )
  const [googleLoading, setGoogleLoading] = useState(false)
  /** Set only after the server says this account has a second factor. */
  const [needsCode, setNeedsCode] = useState(false)
  const [code, setCode] = useState('')

  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'))
  const justRegistered = searchParams.get('registered') === '1'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginInput) {
    setFormError(null)

    const result = await signIn('credentials', {
      email: values.email,
      password: values.password,
      // Only sent once the account has asked for it.
      ...(needsCode ? { code } : {}),
      redirect: false,
    })

    // The password was already correct by the time either of these comes back,
    // so showing them reveals nothing about accounts that do not exist.
    if (result?.error === 'TWO_FACTOR_REQUIRED') {
      setNeedsCode(true)
      setFormError(null)
      return
    }

    if (result?.error === 'TWO_FACTOR_INVALID') {
      setNeedsCode(true)
      setCode('')
      setFormError('That code is not right. Try the next one your app shows.')
      return
    }

    if (!result || result.error) {
      // Same message either way — never reveal which accounts exist.
      setNeedsCode(false)
      setFormError('That email and password do not match an account. Please try again.')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {justRegistered && (
        <Alert variant="success">Your account is ready. Sign in to continue.</Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
        {formError && <Alert variant="error">{formError}</Alert>}

        <Field id={`${formId}-email`} label="Email address" error={errors.email?.message}>
          {(props) => (
            <Input
              {...props}
              {...register('email')}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              enterKeyHint="next"
              autoFocus
            />
          )}
        </Field>

        <Field id={`${formId}-password`} label="Password" error={errors.password?.message}>
          {(props) => (
            <PasswordInput
              {...props}
              {...register('password')}
              autoComplete="current-password"
              enterKeyHint="done"
            />
          )}
        </Field>

        {needsCode && (
          <div className="space-y-2 rounded-2xl border-2 border-primary/30 bg-primary-soft p-5">
            <label
              htmlFor={`${formId}-code`}
              className="flex items-center gap-2 font-display text-base font-semibold text-foreground"
            >
              <ShieldCheck className="size-5 text-primary" aria-hidden />
              Authentication code
            </label>
            <p className="text-sm text-muted-foreground">
              Open your authenticator app and type the six-digit code. If you have lost your phone,
              use one of your recovery codes instead.
            </p>
            <input
              id={`${formId}-code`}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              inputMode="text"
              autoFocus
              maxLength={20}
              placeholder="123456"
              className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-center font-display text-2xl font-bold tracking-[0.3em] text-foreground"
            />
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          block
          disabled={isSubmitting || (needsCode && !code.trim())}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Signing you in…
            </>
          ) : (
            <>
              <LogIn aria-hidden />
              {needsCode ? 'Verify and sign in' : 'Sign in'}
            </>
          )}
        </Button>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-4">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            block
            disabled={googleLoading}
            onClick={() => {
              setGoogleLoading(true)
              void signIn('google', { callbackUrl })
            }}
          >
            {googleLoading ? <Loader2 className="animate-spin" aria-hidden /> : null}
            Continue with Google
          </Button>
        </>
      )}

      <p className="text-center text-muted-foreground">
        New here?{' '}
        <Link
          href="/register"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Create a free account
        </Link>
      </p>
    </div>
  )
}
