'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock, Send, Users } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { prayerRequestSchema, type PrayerRequestInput } from '@/lib/validations'
import type { ApiResult } from '@/types'

const categories = [
  { value: 'GENERAL', label: '🙏 Something else' },
  { value: 'HEALING', label: '🩹 Healing' },
  { value: 'FAMILY', label: '👨‍👩‍👧 Family' },
  { value: 'RELATIONSHIPS', label: '🤝 Relationships' },
  { value: 'FINANCES', label: '🌾 Money and provision' },
  { value: 'GUIDANCE', label: '🧭 A decision I am facing' },
  { value: 'SALVATION', label: '❤️ Someone I want to know Jesus' },
  { value: 'THANKSGIVING', label: '🎉 Saying thank you to God' },
]

const urgencies = [
  { value: 'LOW', label: 'Whenever you can' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Urgent — please pray soon' },
  { value: 'URGENT', label: 'Very urgent — this is an emergency' },
]

const visibilities = [
  { value: 'PUBLIC', label: 'Anyone can see it', hint: 'It appears on the public prayer wall.' },
  { value: 'MEMBERS_ONLY', label: 'Only church members', hint: 'Signed-in members of this church.' },
  { value: 'PRIVATE', label: 'Only the prayer team', hint: 'For sensitive things. It never reaches the wall.' },
]

export function RequestForm({ groups }: { groups: { id: string; name: string }[] }) {
  const router = useRouter()
  const { status } = useSession()
  const formId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const signedIn = status === 'authenticated'

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PrayerRequestInput>({
    resolver: zodResolver(prayerRequestSchema),
    mode: 'onBlur',
    defaultValues: {
      title: '',
      content: '',
      category: 'GENERAL',
      urgency: 'NORMAL',
      visibility: 'PUBLIC',
      anonymous: false,
      notifyOnResponse: true,
      verse: '',
      guestName: '',
      guestEmail: '',
      groupId: '',
    },
  })

  const visibility = watch('visibility')

  async function onSubmit(values: PrayerRequestInput) {
    setFormError(null)

    try {
      const response = await fetch('/api/prayer/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = (await response.json()) as ApiResult<{ id: string }>

      if (!response.ok || !result.ok) {
        const message = result.ok ? 'Something went wrong.' : result.error
        if (!result.ok && result.fieldErrors) {
          for (const [field, messages] of Object.entries(result.fieldErrors)) {
            if (field in values && messages?.[0]) {
              setError(field as keyof PrayerRequestInput, { type: 'server', message: messages[0] })
            }
          }
        }
        setFormError(message)
        return
      }

      router.push('/prayer/submitted')
      router.refresh()
    } catch {
      setFormError('We could not reach the server. Please check your connection and try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {formError && <Alert variant="error">{formError}</Alert>}

      {!signedIn && (
        <Alert variant="info">
          You can send one request a day as a guest.{' '}
          <a href="/register" className="font-semibold underline">
            Create a free account
          </a>{' '}
          to send more and to keep track of them.
        </Alert>
      )}

      <Field
        id={`${formId}-title`}
        label="What shall we call this?"
        hint="A few words is plenty — for example, “Please pray for my mum”."
        error={errors.title?.message}
      >
        {(props) => <Input {...props} {...register('title')} enterKeyHint="next" />}
      </Field>

      <Field
        id={`${formId}-content`}
        label="Tell us how to pray"
        hint="Share as much or as little as you want."
        error={errors.content?.message}
      >
        {(props) => (
          <textarea
            {...props}
            {...register('content')}
            rows={6}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base transition-colors hover:border-primary/40 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 aria-[invalid=true]:border-destructive"
          />
        )}
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={`${formId}-category`} label="What is it about?" error={errors.category?.message}>
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

        <Field id={`${formId}-urgency`} label="How soon?" error={errors.urgency?.message}>
          {(props) => (
            <select
              {...props}
              {...register('urgency')}
              className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base"
            >
              {urgencies.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>

      {signedIn && (
        <fieldset className="space-y-3">
          <legend className="mb-2 font-display text-base font-semibold text-foreground">
            Who should see this?
          </legend>
          {visibilities.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-border bg-card p-4 transition-colors hover:border-primary/30 has-[:checked]:border-primary/40 has-[:checked]:bg-primary-soft"
            >
              <input
                type="radio"
                value={option.value}
                {...register('visibility')}
                className="mt-1 size-5 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="block font-display font-bold text-foreground">{option.label}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}

      {visibility === 'PRIVATE' && (
        <Alert variant="info">
          <Lock aria-hidden className="inline size-4" /> Only the prayer team and our pastors will
          ever read this. It will not appear on the wall.
        </Alert>
      )}

      {signedIn && groups.length > 0 && (
        <Field
          id={`${formId}-group`}
          label="Share with one of your prayer groups?"
          hint="Optional — leave blank to keep it on the main wall."
          error={errors.groupId?.message}
        >
          {(props) => (
            <select
              {...props}
              {...register('groupId')}
              className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base"
            >
              <option value="">No group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      <Field
        id={`${formId}-verse`}
        label="A verse to go with it (optional)"
        error={errors.verse?.message}
      >
        {(props) => (
          <Input {...props} {...register('verse')} placeholder="e.g. Philippians 4:6-7" />
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
            hint="So we can tell you when someone prays."
            error={errors.guestEmail?.message}
          >
            {(props) => (
              <Input {...props} {...register('guestEmail')} type="email" autoComplete="email" />
            )}
          </Field>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border-2 border-border bg-secondary/30 p-5">
        {signedIn && (
          <Controller
            control={control}
            name="anonymous"
            render={({ field }) => (
              <div className="flex items-start gap-3">
                <Checkbox
                  id={`${formId}-anon`}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor={`${formId}-anon`} className="cursor-pointer text-pretty text-foreground">
                  <span className="font-display font-bold">Post without my name.</span> Your request
                  is still shown, but it will say “Anonymous”.
                </label>
              </div>
            )}
          />
        )}

        <Controller
          control={control}
          name="notifyOnResponse"
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id={`${formId}-notify`}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                className="mt-0.5"
              />
              <label htmlFor={`${formId}-notify`} className="cursor-pointer text-pretty text-foreground">
                <span className="font-display font-bold">Let me know</span> when someone prays or
                leaves an encouragement.
              </label>
            </div>
          )}
        />
      </div>

      <Button type="submit" size="lg" block disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          <>
            <Send aria-hidden />
            Send my prayer request
          </>
        )}
      </Button>

      <p className="flex items-start gap-2 text-center text-sm text-muted-foreground">
        <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="text-left">
          Our prayer team reads every request. Nothing you write here is sold, shared or published
          beyond what you choose above.
        </span>
      </p>
    </form>
  )
}
