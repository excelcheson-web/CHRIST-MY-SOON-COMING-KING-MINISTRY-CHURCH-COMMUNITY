'use client'

import { BellOff, Camera, Loader2, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/lib/storage-constants'
import type { ApiResult } from '@/types'

export type ProfileFormValues = {
  headline: string
  bio: string
  neighbourhood: string
  phone: string
  address: string
  profession: string
  avatar: string | null
  spiritualGifts: string
  interests: string
  skills: string
  mentorAvailable: boolean
  seekingMentor: boolean
  listed: boolean
  showEmail: boolean
  showPhone: boolean
  showBirthday: boolean
  showNeighbourhood: boolean
  showAddress: boolean
  showProfession: boolean
  dndUntil: string | null
}

/** Images only: the shared list also allows PDFs, which a photo cannot be. */
const IMAGE_ACCEPT = ACCEPT_ATTRIBUTE.split(',')
  .filter((mime) => mime.startsWith('image/'))
  .join(',')

const textareaClass =
  'w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35'

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string
  label: string
  hint?: string
  defaultChecked?: boolean
}) {
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

/** Tag pickers write into the textarea, so free text still works alongside. */
function TagField({
  name,
  label,
  hint,
  defaultValue,
  suggestions,
}: {
  name: string
  label: string
  hint: string
  defaultValue: string
  suggestions: readonly string[]
}) {
  const [value, setValue] = useState(defaultValue)
  const chosen = new Set(
    value
      .split('\n')
      .map((line) => line.trim().toLowerCase())
      .filter(Boolean),
  )

  const toggle = (tag: string) => {
    const next = new Set(chosen)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    setValue([...next].join('\n'))
  }

  return (
    <div>
      <label htmlFor={name} className="block">
        <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
          {label}
        </span>
        <span className="mb-2 block text-sm text-muted-foreground">{hint}</span>
      </label>

      <ul className="mb-3 flex flex-wrap gap-2">
        {suggestions.map((tag) => (
          <li key={tag}>
            <button
              type="button"
              onClick={() => toggle(tag)}
              aria-pressed={chosen.has(tag)}
              className={
                chosen.has(tag)
                  ? 'flex min-h-10 items-center rounded-lg border-2 border-primary/35 bg-primary-soft px-3 text-sm font-semibold text-primary'
                  : 'flex min-h-10 items-center rounded-lg border-2 border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground'
              }
            >
              {tag}
            </button>
          </li>
        ))}
      </ul>

      <textarea
        id={name}
        name={name}
        rows={3}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="One per line — tap the buttons above, or type your own"
        className={textareaClass}
      />
    </div>
  )
}

export function ProfileEditor({
  initial,
  gifts,
  interests,
  skills,
}: {
  initial: ProfileFormValues
  gifts: readonly string[]
  interests: readonly string[]
  skills: readonly string[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dnd, setDnd] = useState(initial.dndUntil)

  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const photoInput = useRef<HTMLInputElement>(null)

  function choosePhoto(file: File | null) {
    if (preview) URL.revokeObjectURL(preview)

    if (!file) {
      setPhoto(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That picture is too big — the limit is 8MB.')
      return
    }

    setError(null)
    setRemovePhoto(false)
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  // What is on screen right now: a freshly chosen file, nothing if it was just
  // removed, else whatever is already saved.
  const shownAvatar = preview ?? (removePhoto ? null : initial.avatar)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(null)

    const form = new FormData(event.currentTarget)
    const bool = (key: string) => form.get(key) === 'on'

    try {
      const payload = {
          headline: form.get('headline'),
          bio: form.get('bio'),
          neighbourhood: form.get('neighbourhood'),
          phone: form.get('phone'),
          spiritualGifts: form.get('spiritualGifts'),
          interests: form.get('interests'),
          skills: form.get('skills'),
          mentorAvailable: bool('mentorAvailable'),
          seekingMentor: bool('seekingMentor'),
          listed: bool('listed'),
          showEmail: bool('showEmail'),
          showPhone: bool('showPhone'),
          showBirthday: bool('showBirthday'),
        showNeighbourhood: bool('showNeighbourhood'),
        showAddress: bool('showAddress'),
        showProfession: bool('showProfession'),
        address: form.get('address'),
        profession: form.get('profession'),
      }

      // Always multipart: the photo may or may not be there, and one code path
      // is easier to keep correct than two.
      const outgoing = new FormData()
      for (const [key, value] of Object.entries(payload)) {
        outgoing.set(key, typeof value === 'boolean' ? String(value) : String(value ?? ''))
      }
      if (photo) outgoing.set('photo', photo)
      if (removePhoto) outgoing.set('removePhoto', 'true')

      const response = await fetch('/api/community/profile', { method: 'PUT', body: outgoing })
      const result = (await response.json()) as ApiResult<unknown>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setSaved('Saved. Your profile is up to date.')
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function snooze(hours: number) {
    setBusy(true)
    try {
      const response = await fetch('/api/community/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      })
      const result = (await response.json()) as ApiResult<{ dndUntil: string | null }>
      if (result.ok) {
        setDnd(result.data.dndUntil)
        setSaved(
          result.data.dndUntil ? 'Notifications paused.' : 'Notifications switched back on.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{saved}</Alert>}

      <section className="space-y-5">
        <h2 className="text-xl">About you</h2>

        <div>
          <span className="mb-2 block font-display text-base font-semibold text-foreground">
            Your photo
          </span>
          <div className="flex flex-wrap items-center gap-4">
            {shownAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL or an authenticated route
              <img
                src={shownAvatar}
                alt="Your profile photo"
                className="size-24 shrink-0 rounded-full border-2 border-border object-cover"
              />
            ) : (
              <span
                aria-hidden
                className="grid size-24 shrink-0 place-items-center rounded-full border-2 border-dashed border-border text-muted-foreground"
              >
                <Camera className="size-8" />
              </span>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                className="flex min-h-11 items-center rounded-xl border-2 border-primary/25 px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
              >
                {shownAvatar ? 'Change photo' : 'Add a photo'}
              </button>
              {shownAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    choosePhoto(null)
                    setRemovePhoto(true)
                    if (photoInput.current) photoInput.current.value = ''
                  }}
                  className="flex min-h-11 items-center rounded-xl px-3 font-semibold text-muted-foreground transition-colors hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Only signed-in members can see it, and it disappears if you leave the directory.
          </p>
          <input
            ref={photoInput}
            type="file"
            accept={IMAGE_ACCEPT}
            onChange={(event) => choosePhoto(event.target.files?.[0] ?? null)}
            className="hidden"
          />
        </div>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            One line about you
          </span>
          <Input
            name="headline"
            defaultValue={initial.headline}
            maxLength={120}
            placeholder="Sunday school teacher · dad of three · terrible at football"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            A little more
          </span>
          <textarea name="bio" rows={5} defaultValue={initial.bio} className={textareaClass} />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            Your area
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            A neighbourhood, not an address — &ldquo;East Side&rdquo;, &ldquo;near the
            market&rdquo;. It helps people nearby offer lifts and pray with you.
          </span>
          <Input name="neighbourhood" defaultValue={initial.neighbourhood} maxLength={80} />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            Phone number
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            Only shown if you switch it on below.
          </span>
          <Input name="phone" type="tel" defaultValue={initial.phone} maxLength={40} />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            Home address
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            Pastors can always see this so they can visit you or get help to you. Other members
            never see it unless you switch it on below.
          </span>
          <Input name="address" defaultValue={initial.address} maxLength={300} />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
            What you do
          </span>
          <span className="mb-1.5 block text-sm text-muted-foreground">
            Your job or trade. Leaders look here when the church needs a hand with something.
          </span>
          <Input
            name="profession"
            defaultValue={initial.profession}
            maxLength={120}
            placeholder="Nurse, teacher, driver…"
          />
        </label>
      </section>

      <section className="space-y-6 border-t border-border pt-8">
        <h2 className="text-xl">Gifts, skills and interests</h2>

        <TagField
          name="spiritualGifts"
          label="Spiritual gifts"
          hint="How has God wired you? Leaders use this to find people to serve alongside."
          defaultValue={initial.spiritualGifts}
          suggestions={gifts}
        />

        <TagField
          name="skills"
          label="Things you could help with"
          hint="Practical skills. These appear on the help board when somebody needs a hand."
          defaultValue={initial.skills}
          suggestions={skills}
        />

        <TagField
          name="interests"
          label="Interests"
          hint="What you enjoy. Used to suggest groups and people you might get on with."
          defaultValue={initial.interests}
          suggestions={interests}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle
            name="mentorAvailable"
            label="I am happy to mentor"
            hint="New believers can ask to be matched with you."
            defaultChecked={initial.mentorAvailable}
          />
          <Toggle
            name="seekingMentor"
            label="I would like a mentor"
            hint="A leader will try to match you with somebody."
            defaultChecked={initial.seekingMentor}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="text-xl">Who can see what</h2>
        <p className="text-pretty text-muted-foreground">
          Everything here is off unless you switch it on, and nothing is ever shown to people
          outside the church — the directory needs an account.
        </p>

        <Toggle
          name="listed"
          label="List me in the member directory"
          hint="Turn this off and nobody can find or open your profile."
          defaultChecked={initial.listed}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Toggle name="showEmail" label="Show my email" defaultChecked={initial.showEmail} />
          <Toggle name="showPhone" label="Show my phone number" defaultChecked={initial.showPhone} />
          <Toggle
            name="showBirthday"
            label="Show my birthday"
            hint="The day and month only — never the year."
            defaultChecked={initial.showBirthday}
          />
          <Toggle
            name="showNeighbourhood"
            label="Show my area"
            defaultChecked={initial.showNeighbourhood}
          />
          <Toggle
            name="showProfession"
            label="Show what I do"
            defaultChecked={initial.showProfession}
          />
          <Toggle
            name="showAddress"
            label="Show my home address"
            hint="Think carefully. Pastors can see it either way — this shares it with every signed-in member."
            defaultChecked={initial.showAddress}
          />
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <h2 className="flex items-center gap-2 text-xl">
          <BellOff className="size-5 text-primary" aria-hidden />
          Quiet mode
        </h2>
        <p className="text-pretty text-muted-foreground">
          Pause notifications for a while — for the Sabbath, a fast, or just rest. You can still
          use the site normally.
        </p>

        {dnd && (
          <p className="rounded-2xl border-2 border-primary/25 bg-primary-soft p-4 font-semibold text-primary">
            Paused until {new Date(dnd).toLocaleString('en-GB')}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {[
            { label: 'For 12 hours', hours: 12 },
            { label: 'For a day', hours: 24 },
            { label: 'For a week', hours: 24 * 7 },
          ].map((option) => (
            <button
              key={option.hours}
              type="button"
              onClick={() => snooze(option.hours)}
              disabled={busy}
              className="flex min-h-11 items-center rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground disabled:opacity-60"
            >
              {option.label}
            </button>
          ))}
          {dnd && (
            <button
              type="button"
              onClick={() => snooze(0)}
              disabled={busy}
              className="flex min-h-11 items-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              Turn them back on
            </button>
          )}
        </div>
      </section>

      <div className="border-t border-border pt-8">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-14 items-center gap-2 rounded-xl bg-primary px-8 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Save className="size-5" aria-hidden />
          )}
          Save profile
        </button>
      </div>
    </form>
  )
}
