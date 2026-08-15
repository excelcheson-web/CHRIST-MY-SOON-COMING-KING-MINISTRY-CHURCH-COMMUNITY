'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { TurnstileWidget } from '@/components/turnstile-widget'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { testimonySchema, type TestimonyInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

const categories = [
  { value: 'OTHER', label: '🎉 A God story' },
  { value: 'SALVATION', label: '❤️ Someone came to Jesus' },
  { value: 'HEALING', label: '🩹 Healing' },
  { value: 'PROVISION', label: '🌾 God provided' },
  { value: 'BREAKTHROUGH', label: '🔓 A breakthrough' },
]

export function TestimonyForm() {
  const router = useRouter()
  const { status } = useSession()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const signedIn = status === 'authenticated'

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TestimonyInput>({
    resolver: zodResolver(testimonySchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      content: '',
      category: 'OTHER',
      anonymous: false,
      guestName: '',
      guestEmail: '',
    },
  })

  async function onSubmit(values: TestimonyInput) {
    setFormError(null)

    try {
      const response = await fetch('/api/testimonies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, turnstileToken }),
      })
      const result = (await response.json()) as ApiResult<{ id: string }>

      if (!response.ok || !result.ok) {
        const message = result.ok ? 'Something went wrong.' : result.error
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in values && messages?.[0]) {
              setError(field as keyof TestimonyInput, { type: 'server', message: messages[0] })
            }
          }
        }
        setFormError(message)
        // A spent token cannot be reused, so ask for a fresh one before they retry.
        setTurnstileReset((count) => count + 1)
        return
      }

      router.push('/prayer/testimonies/thank-you')
      router.refresh()
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      <Alert variant="info">
        Every story is read by our team before it goes on the site. That keeps this a safe,
        encouraging place — it usually takes a day or two.
      </Alert>

      <Field
        id={`${formId}-title`}
        label="Give your story a title"
        hint="For example, “God provided when the rent was due”."
        error={errors.title?.message}
      >
        {(props) => <Input {...props} {...register('title')} enterKeyHint="next" />}
      </Field>

      <Field id={`${formId}-category`} label="What kind of story is it?" error={errors.category?.message}>
        {(props) => (
          <select
            {...props}
            {...register('category')}
            className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base"
          >
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        id={`${formId}-content`}
        label="What did God do?"
        hint="Tell it however you would tell a friend. There is no right way."
        error={errors.content?.message}
      >
        {(props) => (
          <textarea
            {...props}
            {...register('content')}
            rows={10}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 aria-[invalid=true]:border-destructive"
          />
        )}
      </Field>

      {!signedIn && (
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id={`${formId}-guest-name`} label="Your name" error={errors.guestName?.message}>
            {(props) => <Input {...props} {...register('guestName')} autoComplete="name" />}
          </Field>
          <Field
            id={`${formId}-guest-email`}
            label="Your email (optional)"
            hint="So we can tell you when it is published."
            error={errors.guestEmail?.message}
          >
            {(props) => (
              <Input {...props} {...register('guestEmail')} type="email" autoComplete="email" />
            )}
          </Field>
        </div>
      )}

      <Controller
        control={control}
        name="anonymous"
        render={({ field }) => (
          <div className="flex items-start gap-3 rounded-2xl border-2 border-border bg-secondary/30 p-5">
            <Checkbox
              id={`${formId}-anon`}
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor={`${formId}-anon`} className="cursor-pointer text-pretty text-foreground">
              <span className="font-display font-bold">Share it without my name.</span> The story is
              published, but it will say “Anonymous”.
            </label>
          </div>
        )}
      />

      {/* Guests only, matching the server. See the note in request-form.tsx. */}
      {!signedIn && (
        <TurnstileWidget
          onVerify={setTurnstileToken}
          action="testimony"
          resetSignal={turnstileReset}
        />
      )}

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden />
            Share my story
          </>
        )}
      </Button>
    </form>
  )
}
