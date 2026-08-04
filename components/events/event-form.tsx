'use client'

import { Loader2, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { eventStatuses, eventTypes } from '@/lib/validations'
import type { ApiResult } from '@/types'

export type EventFormValues = {
  slug?: string
  title: string
  description: string
  type: string
  startsAt: string
  endsAt: string
  locationName: string
  address: string
  isOnline: boolean
  onlineUrl: string
  capacity: string
  price: string
  currency: string
  ministryId: string
  status: string
  requiresRegistration: boolean
  registrationClosesAt: string
  cancellationDeadline: string
  allowGuests: boolean
  maxGuestsPerRegistration: string
  allowWaitlist: boolean
  collectAccessibility: boolean
  collectDietary: boolean
  isFeatured: boolean
}

const typeLabels: Record<string, string> = {
  SERVICE: '⛪ Service',
  CONFERENCE: '🎤 Conference',
  CRUSADE: '🔥 Crusade',
  RETREAT: '🏕️ Retreat',
  BAPTISM: '💧 Baptism',
  MEMBERSHIP_CLASS: '📋 Membership class',
  SMALL_GROUP: '🏠 Small group',
  PRAYER_MEETING: '🙏 Prayer meeting',
  OUTREACH: '🤝 Outreach',
  WORKSHOP: '🛠️ Workshop',
  OTHER: '🎉 Other',
}

function Text({
  name, label, defaultValue, type = 'text', required, hint, placeholder,
}: {
  name: string; label: string; defaultValue?: string; type?: string
  required?: boolean; hint?: string; placeholder?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-base font-semibold text-foreground">{label}</span>
      {hint && <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>}
      <Input name={name} type={type} defaultValue={defaultValue} required={required} placeholder={placeholder} />
    </label>
  )
}

function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
      />
      <span>
        <span className="block font-display font-semibold text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>}
      </span>
    </label>
  )
}

export function EventForm({
  initial,
  ministries,
  mode,
}: {
  initial: Partial<EventFormValues>
  ministries: { id: string; name: string }[]
  mode: 'create' | 'edit'
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setFieldErrors({})

    const form = new FormData(event.currentTarget)
    const bool = (key: string) => form.get(key) === 'on'

    const payload = {
      title: form.get('title'),
      description: form.get('description'),
      type: form.get('type'),
      startsAt: form.get('startsAt'),
      endsAt: form.get('endsAt') || undefined,
      locationName: form.get('locationName'),
      address: form.get('address'),
      isOnline: bool('isOnline'),
      onlineUrl: form.get('onlineUrl'),
      capacity: form.get('capacity'),
      price: form.get('price'),
      currency: form.get('currency') || 'GBP',
      ministryId: form.get('ministryId') || undefined,
      status: form.get('status'),
      requiresRegistration: bool('requiresRegistration'),
      registrationClosesAt: form.get('registrationClosesAt') || undefined,
      cancellationDeadline: form.get('cancellationDeadline') || undefined,
      allowGuests: bool('allowGuests'),
      maxGuestsPerRegistration: form.get('maxGuestsPerRegistration'),
      allowWaitlist: bool('allowWaitlist'),
      collectAccessibility: bool('collectAccessibility'),
      collectDietary: bool('collectDietary'),
      isFeatured: bool('isFeatured'),
    }

    try {
      const response = await fetch(
        mode === 'create' ? '/api/events' : `/api/events/${initial.slug}`,
        {
          method: mode === 'create' ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      const result = (await response.json()) as ApiResult<{ slug: string }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        if (!result.ok && result.fieldErrors) setFieldErrors(result.fieldErrors)
        return
      }

      router.push(`/admin/events/${result.data.slug}`)
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Remove this event? If anyone has booked, it will be cancelled and they will be told.')) return
    setBusy(true)
    try {
      const response = await fetch(`/api/events/${initial.slug}`, { method: 'DELETE' })
      const result = (await response.json()) as ApiResult<{ cancelled: boolean; notified: number }>
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not remove that.' : result.error)
        return
      }
      router.push('/admin/events')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  const err = (key: string) => fieldErrors[key]?.[0]

  return (
    <form onSubmit={submit} className="space-y-8">
      {error && <Alert variant="error">{error}</Alert>}

      <section className="space-y-5">
        <h2 className="text-xl">The basics</h2>
        <Text name="title" label="Title" defaultValue={initial.title} required />
        {err('title') && <p className="text-sm font-semibold text-destructive">{err('title')}</p>}

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            Description
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            Markdown works here — ## for headings, - for bullets.
          </span>
          <textarea
            name="description"
            rows={7}
            defaultValue={initial.description}
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
          />
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-display text-base font-semibold text-foreground">Type</span>
            <select
              name="type"
              defaultValue={initial.type ?? 'SERVICE'}
              className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base"
            >
              {eventTypes.map((value) => (
                <option key={value} value={value}>{typeLabels[value]}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display text-base font-semibold text-foreground">Ministry</span>
            <select
              name="ministryId"
              defaultValue={initial.ministryId ?? ''}
              className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base"
            >
              <option value="">No particular ministry</option>
              {ministries.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">When and where</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Text name="startsAt" label="Starts" type="datetime-local" defaultValue={initial.startsAt} required />
          <Text name="endsAt" label="Ends (optional)" type="datetime-local" defaultValue={initial.endsAt} />
        </div>
        {err('endsAt') && <p className="text-sm font-semibold text-destructive">{err('endsAt')}</p>}

        <Text name="locationName" label="Venue name" defaultValue={initial.locationName} placeholder="e.g. Praise Arena main hall" />
        <Text name="address" label="Address" defaultValue={initial.address} />

        <Toggle name="isOnline" label="This event is online" defaultChecked={initial.isOnline} />
        <Text name="onlineUrl" label="Joining link" defaultValue={initial.onlineUrl} placeholder="https://…" />
        {err('onlineUrl') && <p className="text-sm font-semibold text-destructive">{err('onlineUrl')}</p>}
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">Booking</h2>
        <Toggle
          name="requiresRegistration"
          label="People need to book a place"
          defaultChecked={initial.requiresRegistration ?? true}
          hint="Turn this off for regular services where everyone just turns up."
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <Text
            name="capacity"
            label="Capacity"
            type="number"
            defaultValue={initial.capacity}
            hint="Leave blank for unlimited. Counts guests too."
          />
          <Text name="price" label="Price" type="number" defaultValue={initial.price ?? '0'} hint="0 for free." />
          <Text name="currency" label="Currency" defaultValue={initial.currency ?? 'GBP'} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Text name="registrationClosesAt" label="Booking closes" type="datetime-local" defaultValue={initial.registrationClosesAt} />
          <Text name="cancellationDeadline" label="Cancellation deadline" type="datetime-local" defaultValue={initial.cancellationDeadline} />
        </div>

        <Toggle name="allowGuests" label="People can bring guests" defaultChecked={initial.allowGuests ?? true} />
        <Text name="maxGuestsPerRegistration" label="Guests per booking" type="number" defaultValue={initial.maxGuestsPerRegistration ?? '5'} />
        <Toggle name="allowWaitlist" label="Keep a waitlist when full" defaultChecked={initial.allowWaitlist ?? true} hint="People are confirmed automatically when a place opens up." />
        <Toggle name="collectAccessibility" label="Ask about access needs" defaultChecked={initial.collectAccessibility ?? true} />
        <Toggle name="collectDietary" label="Ask about dietary needs" defaultChecked={initial.collectDietary} hint="Turn on when food is being served." />
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">Publishing</h2>
        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">Status</span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            Drafts are invisible to visitors.
          </span>
          <select
            name="status"
            defaultValue={initial.status ?? 'DRAFT'}
            className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base"
          >
            {eventStatuses.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
        <Toggle name="isFeatured" label="Feature on the homepage" defaultChecked={initial.isFeatured} />
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {mode === 'create' ? 'Create event' : 'Save changes'}
        </Button>

        {mode === 'edit' && (
          <Button type="button" variant="ghost" size="lg" onClick={remove} disabled={busy}>
            <Trash2 className="text-destructive" aria-hidden />
            Cancel or remove
          </Button>
        )}
      </div>
    </form>
  )
}
