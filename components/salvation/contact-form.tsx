'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { salvationContactSchema, type SalvationContactInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

export function ContactForm() {
  const router = useRouter()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SalvationContactInput>({
    resolver: zodResolver(salvationContactSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      decision: 'SALVATION',
      notes: '',
    },
  })

  async function onSubmit(values: SalvationContactInput) {
    setFormError(null)

    try {
      const response = await fetch('/api/salvation/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = (await response.json()) as ApiResult<{ assigned: boolean }>

      if (!response.ok || !result.ok) {
        const message = result.ok ? 'Something went wrong.' : result.error

        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in values && messages?.[0]) {
              setError(field as keyof SalvationContactInput, { type: 'server', message: messages[0] })
            }
          }
        }

        setFormError(message)
        return
      }

      router.push('/salvation/complete')
      router.refresh()
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={`${formId}-first`} label="First name" error={errors.firstName?.message}>
          {(props) => (
            <Input {...props} {...register('firstName')} autoComplete="given-name" enterKeyHint="next" />
          )}
        </Field>

        <Field id={`${formId}-last`} label="Last name" error={errors.lastName?.message}>
          {(props) => (
            <Input {...props} {...register('lastName')} autoComplete="family-name" enterKeyHint="next" />
          )}
        </Field>
      </div>

      <Field
        id={`${formId}-email`}
        label="Email address"
        hint="Give us an email or a phone number — whichever you prefer."
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
            enterKeyHint="next"
          />
        )}
      </Field>

      <Field id={`${formId}-phone`} label="Phone number" error={errors.phone?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+000 000 0000"
            enterKeyHint="next"
          />
        )}
      </Field>

      <Field
        id={`${formId}-notes`}
        label="Anything you would like us to know?"
        hint="Optional. A question, a prayer request, or nothing at all."
        error={errors.notes?.message}
      >
        {(props) => (
          <textarea
            {...props}
            {...register('notes')}
            rows={4}
            className="flex w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground shadow-sm transition-colors placeholder:text-muted-foreground hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 aria-[invalid=true]:border-destructive"
          />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden />
            Send this to the church
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Your details go to our follow-up team and nowhere else. We never sell or share them.
      </p>
    </form>
  )
}
