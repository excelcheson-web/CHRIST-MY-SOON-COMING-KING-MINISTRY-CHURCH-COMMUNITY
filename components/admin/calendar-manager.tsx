'use client'

import { CalendarDays, Eye, EyeOff, ImagePlus, Loader2, Plus, RotateCcw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { countdownLabel } from '@/lib/church-year'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/lib/storage-constants'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

const IMAGE_ACCEPT = ACCEPT_ATTRIBUTE.split(',')
  .filter((mime) => mime.startsWith('image/'))
  .join(',')

export type AdminCalendarEntry = {
  key: string
  title: string
  description: string
  /** Already formatted on the server — the client never re-derives a date. */
  when: string
  inDays: number
  emoji: string
  image: string | null
  moveable: boolean
  customised: boolean
}

/**
 * Editing the Christian calendar.
 *
 * Two things are deliberately not editable here: **when** a feast falls, and
 * which feasts exist. Both are computed in `lib/church-year.ts` — Easter moves
 * every year and eight other observances hang off it, so a date typed in by
 * hand is a date that goes wrong next January. What a church genuinely wants to
 * change is the wording and the picture, and that is what this edits.
 *
 * One-off dates (a convention, a crusade) are the exception and get a real date
 * field, because nothing can compute those.
 */
export function CalendarManager({ initial }: { initial: AdminCalendarEntry[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function send(body: FormData, message: string) {
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const response = await fetch('/api/calendar', { method: 'PUT', body })
      const result = (await response.json()) as ApiResult<unknown>
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return false
      }
      setSaved(message)
      setEditing(null)
      setAdding(false)
      router.refresh()
      return true
    } catch {
      setError('We could not reach the server.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function revert(key: string) {
    if (!confirm('Go back to the built-in wording and artwork for this date?')) return
    setBusy(true)
    setError(null)
    try {
      await fetch(`/api/calendar?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
      setSaved('Back to the built-in version.')
      setEditing(null)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function toggle(entry: AdminCalendarEntry) {
    const body = new FormData()
    body.set('key', entry.key)
    body.set('title', entry.title)
    body.set('description', entry.description)
    body.set('isActive', 'false')
    await send(body, `${entry.title} is hidden from the home page.`)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl sm:text-3xl">
          <CalendarDays className="size-6 text-primary" aria-hidden />
          What is coming
        </h2>
        <button
          type="button"
          onClick={() => {
            setAdding((value) => !value)
            setEditing(null)
          }}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {adding ? <X className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
          {adding ? 'Cancel' : 'Add a one-off date'}
        </button>
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}
      {saved && (
        <Alert variant="success" className="mt-6">
          {saved}
        </Alert>
      )}

      {adding && <OneOffForm busy={busy} onSubmit={send} />}

      <ul className="mt-8 space-y-4">
        {initial.map((entry) => (
          <li key={entry.key}>
            <article
              className={cn(
                'rounded-3xl border-2 bg-card p-6 shadow-soft',
                entry.customised ? 'border-primary/30' : 'border-border',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  {entry.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served by our own route
                    <img
                      src={entry.image}
                      alt=""
                      className="size-16 shrink-0 rounded-2xl border-2 border-border object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary-soft text-3xl"
                    >
                      {entry.emoji}
                    </span>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                        {countdownLabel(entry.inDays)}
                      </span>
                      {entry.moveable && (
                        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                          Moves each year
                        </span>
                      )}
                      {entry.customised && (
                        <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                          Edited
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3 font-display text-lg font-bold text-foreground">
                      {entry.title}
                    </h3>
                    <p className="text-sm font-semibold text-primary">{entry.when}</p>
                    <p className="mt-1 text-pretty text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(editing === entry.key ? null : entry.key)}
                    className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
                  >
                    {editing === entry.key ? 'Close' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(entry)}
                    disabled={busy}
                    title="Hide it from the home page"
                    className="flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
                  >
                    <EyeOff className="size-4" aria-hidden />
                    Hide
                  </button>
                </div>
              </div>

              {editing === entry.key && (
                <EditForm
                  entry={entry}
                  busy={busy}
                  onSubmit={send}
                  onRevert={() => revert(entry.key)}
                />
              )}
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Wording and artwork for a date that already exists. */
function EditForm({
  entry,
  busy,
  onSubmit,
  onRevert,
}: {
  entry: AdminCalendarEntry
  busy: boolean
  onSubmit: (body: FormData, message: string) => Promise<boolean>
  onRevert: () => void
}) {
  const [art, setArt] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function choose(file: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    if (!file || file.size > MAX_UPLOAD_BYTES) {
      setArt(null)
      setPreview(null)
      return
    }
    setArt(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = new FormData()
    body.set('key', entry.key)
    body.set('title', String(form.get('title') ?? ''))
    const description = String(form.get('description') ?? '')
    if (description) body.set('description', description)
    body.set('isActive', 'true')
    if (art) body.set('art', art)

    const ok = await onSubmit(body, `${entry.title} updated.`)
    if (ok) choose(null)
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5 border-t-2 border-border pt-6">
      <p className="text-sm text-muted-foreground">
        The date itself is worked out for you and cannot be changed here
        {entry.moveable ? ' — this one moves with Easter every year.' : '.'}
      </p>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">
          What to call it
        </span>
        <Input name="title" defaultValue={entry.title} required maxLength={140} />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">
          A line about it
        </span>
        <textarea
          name="description"
          rows={3}
          defaultValue={entry.description}
          maxLength={600}
          className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
        />
      </label>

      <div>
        <span className="mb-2 block font-display font-semibold text-foreground">
          Picture (optional)
        </span>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL
          <img
            src={preview}
            alt="The picture you chose"
            className="mb-3 max-h-48 rounded-2xl border-2 border-border object-contain"
          />
        )}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <ImagePlus className="size-5" aria-hidden />
          {entry.image || art ? 'Choose another' : 'Add a picture'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={(event) => choose(event.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Save
        </button>

        {entry.customised && (
          <button
            type="button"
            onClick={onRevert}
            disabled={busy}
            className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-5 font-display font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RotateCcw className="size-5" aria-hidden />
            Use the built-in version
          </button>
        )}
      </div>
    </form>
  )
}

/** A date nothing can compute — a convention, a crusade, a visiting minister. */
function OneOffForm({
  busy,
  onSubmit,
}: {
  busy: boolean
  onSubmit: (body: FormData, message: string) => Promise<boolean>
}) {
  const [art, setArt] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '')
    const body = new FormData()

    // The key is what the home page merges on, so it is derived from the title
    // rather than asked for — one fewer thing to get wrong.
    body.set(
      'key',
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || `date-${Date.now()}`,
    )
    body.set('title', title)
    const description = String(form.get('description') ?? '')
    if (description) body.set('description', description)
    body.set('onceOn', String(form.get('onceOn') ?? ''))
    body.set('isActive', 'true')
    if (art) body.set('art', art)

    const ok = await onSubmit(body, `${title} added to the calendar.`)
    if (ok) {
      event.currentTarget.reset()
      setArt(null)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-6 space-y-5 rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7"
    >
      <Alert variant="info">
        For dates the church sets itself. The historic feasts above are already worked out — you do
        not need to add those.
      </Alert>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">What is it</span>
        <Input name="title" required maxLength={140} placeholder="Deliverance Convention" />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">Which day</span>
        <Input name="onceOn" type="date" required />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">
          A line about it
        </span>
        <textarea
          name="description"
          rows={3}
          maxLength={600}
          className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
        />
      </label>

      <div>
        <span className="mb-2 block font-display font-semibold text-foreground">
          Picture (optional)
        </span>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <ImagePlus className="size-5" aria-hidden />
          {art ? art.name : 'Add a picture'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={(event) => setArt(event.target.files?.[0] ?? null)}
          className="hidden"
        />
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
        Add it
      </button>
    </form>
  )
}

/** Shown on the page above the list, so a pastor knows what visitors see. */
export function HiddenDates({ keys }: { keys: string[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (keys.length === 0) return null

  async function restore(key: string) {
    setBusy(true)
    try {
      await fetch(`/api/calendar?key=${encodeURIComponent(key)}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-8 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-6">
      <h3 className="flex items-center gap-2 font-display font-bold text-foreground">
        <Eye className="size-5 text-muted-foreground" aria-hidden />
        Hidden from the home page
      </h3>
      <ul className="mt-4 flex flex-wrap gap-2">
        {keys.map((key) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => restore(key)}
              disabled={busy}
              className="flex min-h-10 items-center gap-2 rounded-lg border-2 border-border bg-card px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground disabled:opacity-60"
            >
              <RotateCcw className="size-4" aria-hidden />
              {key}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
