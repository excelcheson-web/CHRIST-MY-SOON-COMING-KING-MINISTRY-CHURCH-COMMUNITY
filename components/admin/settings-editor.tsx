'use client'

import { Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

export type SettingsFormValues = {
  name: string
  legalName: string
  shortName: string
  aka: string
  tagline: string
  description: string
  contactEmail: string
  contactPhone: string
  contactAddress: string
  serviceTimes: { day: string; label: string; time: string }[]
  facebook: string
  youtube: string
  instagram: string
  source: 'database' | 'bundled'
}

function Field({
  name,
  label,
  hint,
  defaultValue,
  required,
  type = 'text',
  maxLength,
  error,
}: {
  name: string
  label: string
  hint?: string
  defaultValue?: string
  required?: boolean
  type?: string
  maxLength?: number
  error?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
        {label}
      </span>
      {hint && <span className="mb-1.5 block text-sm text-muted-foreground">{hint}</span>}
      <Input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="mt-1.5 block text-sm font-semibold text-destructive">{error}</span>}
    </label>
  )
}

export function SettingsEditor({ settings }: { settings: SettingsFormValues }) {
  const router = useRouter()
  const [times, setTimes] = useState(
    settings.serviceTimes.length > 0 ? settings.serviceTimes : [{ day: '', label: '', time: '' }],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setBusy(true)
    setError(null)
    setSaved(null)
    setFieldErrors({})

    const payload = {
      name: form.get('name'),
      legalName: form.get('legalName'),
      shortName: form.get('shortName'),
      aka: form.get('aka'),
      tagline: form.get('tagline'),
      description: form.get('description'),
      contactEmail: form.get('contactEmail'),
      contactPhone: form.get('contactPhone'),
      contactAddress: form.get('contactAddress'),
      // Blank rows are dropped server-side; sending them keeps the UI simple.
      serviceTimes: times,
      facebook: form.get('facebook'),
      youtube: form.get('youtube'),
      instagram: form.get('instagram'),
    }

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as ApiResult

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        if (!result.ok && result.fieldErrors) setFieldErrors(result.fieldErrors)
        return
      }

      setSaved('Saved. Every page now shows the new details.')
      router.refresh()
    } catch {
      setError('We could not reach the server. Your changes were not saved.')
    } finally {
      setBusy(false)
    }
  }

  async function revert() {
    if (!confirm('Go back to the details this site was built with? This cannot be undone.')) return
    setBusy(true)
    try {
      await fetch('/api/admin/settings', { method: 'DELETE' })
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  const err = (key: string) => fieldErrors[key]?.[0]

  return (
    <form onSubmit={save} className="space-y-10">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{saved}</Alert>}

      <section className="space-y-5">
        <h2 className="text-xl">Who you are</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="name"
            label="Ministry name"
            hint="The real name. This leads everywhere — header, page titles, search results."
            defaultValue={settings.name}
            required
            maxLength={120}
            error={err('name')}
          />
          <Field
            name="shortName"
            label="Abbreviation"
            hint="e.g. CMSCK"
            defaultValue={settings.shortName}
            required
            maxLength={24}
            error={err('shortName')}
          />
        </div>

        <Field
          name="aka"
          label="Also known as"
          hint="A slogan the church is known by — e.g. Praise Arena. Always shown as a second line, never instead of the ministry name. Leave blank if you do not use one."
          defaultValue={settings.aka}
          maxLength={80}
          error={err('aka')}
        />

        <Field
          name="legalName"
          label="Full registered name"
          hint="Used in the footer copyright and for search engines."
          defaultValue={settings.legalName}
          required
          maxLength={160}
          error={err('legalName')}
        />

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            Tagline
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            The welcoming line under the hero heading.
          </span>
          <textarea
            name="tagline"
            rows={2}
            maxLength={300}
            defaultValue={settings.tagline}
            required
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
          />
          {err('tagline') && (
            <span className="mt-1.5 block text-sm font-semibold text-destructive">
              {err('tagline')}
            </span>
          )}
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            Description
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            What Google and WhatsApp show when someone finds or shares the site. Two sentences is
            about right.
          </span>
          <textarea
            name="description"
            rows={3}
            maxLength={600}
            defaultValue={settings.description}
            required
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base"
          />
          {err('description') && (
            <span className="mt-1.5 block text-sm font-semibold text-destructive">
              {err('description')}
            </span>
          )}
        </label>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <h2 className="text-xl">How people reach you</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            name="contactEmail"
            label="Email"
            type="email"
            defaultValue={settings.contactEmail}
            required
            error={err('contactEmail')}
          />
          <Field
            name="contactPhone"
            label="Phone"
            type="tel"
            defaultValue={settings.contactPhone}
            required
            error={err('contactPhone')}
          />
        </div>
        <Field
          name="contactAddress"
          label="Where you meet"
          defaultValue={settings.contactAddress}
          required
          maxLength={300}
          error={err('contactAddress')}
        />
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div>
          <h2 className="text-xl">When you meet</h2>
          <p className="mt-2 text-pretty text-muted-foreground">
            These appear in the footer, on the homepage and on the events page.
          </p>
        </div>

        <ul className="space-y-3">
          {times.map((row, index) => (
            <li key={index} className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr_auto]">
              <Input
                aria-label={`Day for service ${index + 1}`}
                placeholder="Sunday"
                value={row.day}
                onChange={(event) =>
                  setTimes((current) =>
                    current.map((r, i) => (i === index ? { ...r, day: event.target.value } : r)),
                  )
                }
              />
              <Input
                aria-label={`Name for service ${index + 1}`}
                placeholder="Main Celebration"
                value={row.label}
                onChange={(event) =>
                  setTimes((current) =>
                    current.map((r, i) => (i === index ? { ...r, label: event.target.value } : r)),
                  )
                }
              />
              <Input
                aria-label={`Time for service ${index + 1}`}
                placeholder="9:00 AM"
                value={row.time}
                onChange={(event) =>
                  setTimes((current) =>
                    current.map((r, i) => (i === index ? { ...r, time: event.target.value } : r)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setTimes((current) => current.filter((_, i) => i !== index))}
                aria-label={`Remove service ${index + 1}`}
              >
                <Trash2 className="size-5 text-destructive" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          onClick={() => setTimes((current) => [...current, { day: '', label: '', time: '' }])}
        >
          <Plus aria-hidden />
          Add a service
        </Button>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div>
          <h2 className="text-xl">Social links</h2>
          <p className="mt-2 text-pretty text-muted-foreground">
            Leave one blank and its button simply does nothing.
          </p>
        </div>
        <Field
          name="facebook"
          label="Facebook"
          defaultValue={settings.facebook === '#' ? '' : settings.facebook}
          error={err('facebook')}
        />
        <Field
          name="youtube"
          label="YouTube"
          defaultValue={settings.youtube === '#' ? '' : settings.youtube}
          error={err('youtube')}
        />
        <Field
          name="instagram"
          label="Instagram"
          defaultValue={settings.instagram === '#' ? '' : settings.instagram}
          error={err('instagram')}
        />
      </section>

      <div className="flex flex-wrap gap-3 border-t border-border pt-8">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Save details
        </Button>

        {settings.source === 'database' && (
          <Button type="button" variant="ghost" size="lg" onClick={revert} disabled={busy}>
            <RotateCcw aria-hidden />
            Undo all my edits
          </Button>
        )}
      </div>
    </form>
  )
}
