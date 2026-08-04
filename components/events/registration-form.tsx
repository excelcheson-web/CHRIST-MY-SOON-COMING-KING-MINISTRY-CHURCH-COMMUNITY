'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Ticket } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useState } from 'react'
import { useForm } from 'react-hook-form'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { eventRegistrationSchema, type EventRegistrationInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

export function EventRegistrationForm({
  slug,
  allowGuests,
  maxGuests,
  collectAccessibility,
  collectDietary,
  isFull,
  allowWaitlist,
}: {
  slug: string
  allowGuests: boolean
  maxGuests: number
  collectAccessibility: boolean
  collectDietary: boolean
  isFull: boolean
  allowWaitlist: boolean
}) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventRegistrationInput>({
    resolver: zodResolver(eventRegistrationSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      guests: 0,
      accessibilityNeeds: '',
      dietaryNotes: '',
    },
  })

  // Members should not retype what we already know about them.
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      if (session.user.name) setValue('name', session.user.name)
      if (session.user.email) setValue('email', session.user.email)
    }
  }, [status, session, setValue])

  async function onSubmit(values: EventRegistrationInput) {
    setFormError(null)

    try {
      const response = await fetch(`/api/events/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = (await response.json()) as ApiResult<{ token: string }>

      if (!response.ok || !result.ok) {
        const message = result.ok ? 'Something went wrong.' : result.error
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in values && messages?.[0]) {
              setError(field as keyof EventRegistrationInput, { type: 'server', message: messages[0] })
            }
          }
        }
        setFormError(message)
        return
      }

      router.push(`/events/${slug}/booked/${result.data.token}`)
      router.refresh()
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    }
  }

  if (isFull && !allowWaitlist) {
    return (
      <Alert variant="info">
        This event is full and the waitlist is closed. Please contact the church office — they may
        still be able to help.
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      {isFull && (
        <Alert variant="info">
          Every place is taken, but you can join the waitlist. If someone drops out we will confirm
          you automatically and email you.
        </Alert>
      )}

      <Field id={`${formId}-name`} label="Your name" error={errors.name?.message}>
        {(props) => <Input {...props} {...register('name')} autoComplete="name" enterKeyHint="next" />}
      </Field>

      <Field id={`${formId}-email`} label="Email address" hint="Your booking confirmation goes here." error={errors.email?.message}>
        {(props) => (
          <Input
            {...props}
            {...register('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="next"
          />
        )}
      </Field>

      <Field id={`${formId}-phone`} label="Phone number (optional)" error={errors.phone?.message}>
        {(props) => (
          <Input {...props} {...register('phone')} type="tel" inputMode="tel" autoComplete="tel" />
        )}
      </Field>

      {allowGuests && maxGuests > 0 && (
        <Field
          id={`${formId}-guests`}
          label="Anyone coming with you?"
          hint={`Not counting yourself. Up to ${maxGuests}.`}
          error={errors.guests?.message}
        >
          {(props) => (
            <Input
              {...props}
              {...register('guests')}
              type="number"
              inputMode="numeric"
              min={0}
              max={maxGuests}
            />
          )}
        </Field>
      )}

      {collectAccessibility && (
        <Field
          id={`${formId}-access`}
          label="Anything we can do to make this easier for you?"
          hint="Step-free access, a seat near the front, a hearing loop — just say."
          error={errors.accessibilityNeeds?.message}
        >
          {(props) => (
            <textarea
              {...props}
              {...register('accessibilityNeeds')}
              rows={3}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
            />
          )}
        </Field>
      )}

      {collectDietary && (
        <Field
          id={`${formId}-diet`}
          label="Any dietary needs?"
          hint="Food is being served at this one."
          error={errors.dietaryNotes?.message}
        >
          {(props) => (
            <textarea
              {...props}
              {...register('dietaryNotes')}
              rows={3}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
            />
          )}
        </Field>
      )}

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Booking…
          </>
        ) : (
          <>
            <Ticket aria-hidden />
            {isFull ? 'Join the waitlist' : 'Book my place'}
          </>
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        You will get a pass with a QR code. Bring it on your phone — or just give your name at the
        door.
      </p>
    </form>
  )
}
