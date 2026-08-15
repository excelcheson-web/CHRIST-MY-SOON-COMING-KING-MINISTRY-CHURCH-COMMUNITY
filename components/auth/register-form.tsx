'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ChevronDown, Loader2, UserPlus } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { PasswordInput } from '@/components/auth/password-input'
import { StrengthMeter } from '@/components/auth/strength-meter'
import { TurnstileWidget } from '@/components/turnstile-widget'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/lib/storage-constants'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  ageOn,
  CONSENT_AGE,
  MINIMUM_AGE,
  passwordStrength,
  registerSchema,
  type RegisterInput,
} from '@/lib/validations'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

/** Images only: the shared list also allows PDFs, which a photo cannot be. */
const IMAGE_ACCEPT = ACCEPT_ATTRIBUTE.split(',')
  .filter((mime) => mime.startsWith('image/'))
  .join(',')

export function RegisterForm({
  ministries = [],
}: {
  /** Departments somebody can ask to join as they sign up. */
  ministries?: { id: string; name: string }[]
}) {
  const router = useRouter()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)

  /*
   * Everything past the four required fields is folded away behind a toggle.
   * A long form is the fastest way to lose somebody who arrived ready to join,
   * and all of it can be filled in later from the profile page — which the
   * section says, so nobody feels they are skipping something important.
   */
  const [showMore, setShowMore] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const photoInput = useRef<HTMLInputElement>(null)

  function choosePhoto(file: File | null) {
    if (preview) URL.revokeObjectURL(preview)

    if (!file) {
      setPhoto(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFormError('That picture is too big — the limit is 8MB.')
      return
    }

    setFormError(null)
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      birthDate: '',
      parentalConsent: false,
      terms: false,
    },
  })

  const password = watch('password')
  const birthDate = watch('birthDate')

  // 13–17 year-olds may join with a guardian's agreement; under-13s may not.
  const age = birthDate && !Number.isNaN(Date.parse(birthDate)) ? ageOn(new Date(birthDate)) : null
  const needsGuardian = age !== null && age >= MINIMUM_AGE && age < CONSENT_AGE

  /*
   * Bumped after every attempt so the next one carries a fresh token. A token
   * is spent the moment the server checks it, and a failed submission — a
   * duplicate email, say — leaves the person on the form about to try again.
   */
  const retry = () => setTurnstileReset((count) => count + 1)

  async function onSubmit(values: RegisterInput) {
    setFormError(null)

    try {
      /*
       * Multipart only when a photograph came with it. Most people sign up
       * without one, and JSON keeps that path simple on both ends.
       */
      let response: Response
      if (photo) {
        const form = new FormData()
        for (const [key, value] of Object.entries(values)) {
          if (value === undefined || value === null || value === '') continue
          form.set(key, typeof value === 'boolean' ? String(value) : String(value))
        }
        // Booleans have to be sent even when false — the server reads
        // `=== 'true'`, and an absent `terms` would fail validation.
        form.set('terms', String(values.terms))
        form.set('parentalConsent', String(values.parentalConsent))
        form.set('photo', photo)
        // Sent on both branches, or signing up with a photo would fail the
        // human check while signing up without one succeeded.
        if (turnstileToken) form.set('turnstileToken', turnstileToken)
        response = await fetch('/api/register', { method: 'POST', body: form })
      } else {
        response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...values, turnstileToken }),
        })
      }

      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        const message = result.ok ? 'Something went wrong.' : result.error

        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in values && messages?.[0]) {
              setError(field as keyof RegisterInput, { type: 'server', message: messages[0] })
            }
          }
        }

        setFormError(message)
        retry()
        return
      }

      // Account created — sign them straight in so there is no second form.
      const signInResult = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      })

      if (signInResult?.error) {
        setFormError('Your account was created. Please sign in to continue.')
        router.push('/login')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Field id={`${formId}-name`} label="Your full name" error={errors.name?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('name')}
            autoComplete="name"
            placeholder="e.g. Grace Mensah"
            enterKeyHint="next"
          />
        )}
      </Field>

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
          />
        )}
      </Field>

      <Field
        id={`${formId}-birth`}
        label="Date of birth"
        hint="You need to be 13 or older to have an account here."
        error={errors.birthDate?.message}
      >
        {(props) => (
          <Input
            {...props}
            {...register('birthDate')}
            type="date"
            autoComplete="bday"
            max={new Date().toISOString().slice(0, 10)}
          />
        )}
      </Field>

      {needsGuardian && (
        <Controller
          control={control}
          name="parentalConsent"
          render={({ field }) => (
            <div className="space-y-2 rounded-2xl border-2 border-accent/30 bg-accent-soft/50 p-5">
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${formId}-guardian`}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  aria-invalid={Boolean(errors.parentalConsent)}
                  aria-describedby={
                    errors.parentalConsent ? `${formId}-guardian-error` : undefined
                  }
                  className="mt-0.5"
                />
                <label
                  htmlFor={`${formId}-guardian`}
                  className="cursor-pointer text-pretty leading-relaxed text-foreground"
                >
                  <span className="font-display font-bold">
                    You are under 18, so we need a grown-up too.
                  </span>{' '}
                  My parent or guardian knows I am joining and agrees.
                </label>
              </div>
              {errors.parentalConsent && (
                <p
                  id={`${formId}-guardian-error`}
                  role="alert"
                  className="text-sm font-semibold text-destructive"
                >
                  {errors.parentalConsent.message}
                </p>
              )}
            </div>
          )}
        />
      )}

      <Field
        id={`${formId}-password`}
        label="Create a password"
        hint="At least 8 characters, with one letter and one number."
        error={errors.password?.message}
      >
        {(props) => (
          <>
            <PasswordInput {...props} {...register('password')} autoComplete="new-password" />
            <StrengthMeter value={password} />
          </>
        )}
      </Field>

      <Field
        id={`${formId}-confirm`}
        label="Type your password again"
        error={errors.confirmPassword?.message}
      >
        {(props) => (
          <PasswordInput
            {...props}
            {...register('confirmPassword')}
            autoComplete="new-password"
            enterKeyHint="done"
          />
        )}
      </Field>

      {/* ------------------------------------------------------------------
          Optional. Collapsed by default, and it says so twice — once on the
          button and once inside — because people fill in forms defensively and
          need telling that skipping this costs them nothing.
      ------------------------------------------------------------------- */}
      <div className="rounded-2xl border-2 border-border bg-secondary/30 p-5">
        <button
          type="button"
          onClick={() => setShowMore((value) => !value)}
          aria-expanded={showMore}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block font-display font-bold text-foreground">
              Tell us a little more
            </span>
            <span className="mt-0.5 block text-sm text-muted-foreground">
              All optional — you can add any of it later from your profile.
            </span>
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              'size-5 shrink-0 text-primary transition-transform',
              showMore && 'rotate-180',
            )}
          />
        </button>

        {showMore && (
          <div className="mt-6 space-y-5">
            <div>
              <span className="mb-2 block font-display text-sm font-semibold text-foreground">
                A photo of you
              </span>
              <div className="flex items-center gap-4">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local object URL, never a served asset
                  <img
                    src={preview}
                    alt="The photo you chose"
                    className="size-20 shrink-0 rounded-full border-2 border-border object-cover"
                  />
                ) : (
                  <span
                    aria-hidden
                    className="grid size-20 shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground"
                  >
                    <Camera className="size-7" />
                  </span>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => photoInput.current?.click()}
                    className="flex min-h-11 items-center rounded-xl border-2 border-primary/25 px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
                  >
                    {photo ? 'Choose another' : 'Choose a photo'}
                  </button>
                  {photo && (
                    <button
                      type="button"
                      onClick={() => {
                        choosePhoto(null)
                        if (photoInput.current) photoInput.current.value = ''
                      }}
                      className="flex min-h-11 items-center rounded-xl px-3 font-semibold text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={photoInput}
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>

            <Field
              id={`${formId}-phone`}
              label="Phone number"
              hint="So we can reach you. Hidden from other members unless you choose to show it."
              error={errors.phone?.message}
            >
              {(props) => <Input {...props} {...register('phone')} type="tel" autoComplete="tel" />}
            </Field>

            <Field
              id={`${formId}-address`}
              label="Home address"
              hint="Only ever seen by pastors unless you switch it on. Useful for visits and for getting help to you."
              error={errors.address?.message}
            >
              {(props) => (
                <Input {...props} {...register('address')} autoComplete="street-address" />
              )}
            </Field>

            <Field
              id={`${formId}-area`}
              label="Your area"
              hint="A neighbourhood, not an address — helps people nearby offer lifts."
              error={errors.neighbourhood?.message}
            >
              {(props) => <Input {...props} {...register('neighbourhood')} />}
            </Field>

            <Field
              id={`${formId}-profession`}
              label="What you do"
              hint="Your job or trade. Leaders use this when the church needs a hand."
              error={errors.profession?.message}
            >
              {(props) => (
                <Input {...props} {...register('profession')} placeholder="Nurse, teacher, driver…" />
              )}
            </Field>

            {ministries.length > 0 && (
              <label className="block">
                <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
                  Department you would like to join
                </span>
                <span className="mb-1.5 block text-sm text-muted-foreground">
                  Nothing is decided by picking one — a leader will get in touch.
                </span>
                <select
                  {...register('ministryId')}
                  className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
                >
                  <option value="">Not sure yet</option>
                  {ministries.map((ministry) => (
                    <option key={ministry.id} value={ministry.id}>
                      {ministry.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
      </div>

      <Controller
        control={control}
        name="terms"
        render={({ field }) => (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${formId}-terms`}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                aria-invalid={Boolean(errors.terms)}
                aria-describedby={errors.terms ? `${formId}-terms-error` : undefined}
                className="mt-0.5"
              />
              <label
                htmlFor={`${formId}-terms`}
                className="cursor-pointer text-pretty leading-relaxed text-foreground"
              >
                I agree to the Terms and to the ministry looking after my details kindly and
                privately.
              </label>
            </div>
            {errors.terms && (
              <p
                id={`${formId}-terms-error`}
                role="alert"
                className="text-sm font-semibold text-destructive"
              >
                {errors.terms.message}
              </p>
            )}
          </div>
        )}
      />

      {/*
        The submit button is never disabled while waiting for a token.
        Turnstile usually passes silently in well under a second, but its script
        can be blocked by an extension or a restrictive network — and a button
        that never becomes clickable would turn that into a person who simply
        cannot join the church. Let them press it; the server answers with a
        plain sentence telling them what to do.
      */}
      <TurnstileWidget onVerify={setTurnstileToken} action="register" resetSignal={turnstileReset} />

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Creating your account…
          </>
        ) : (
          <>
            <UserPlus aria-hidden />
            Create my account
          </>
        )}
      </Button>

      <p className="text-center text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  )
}
