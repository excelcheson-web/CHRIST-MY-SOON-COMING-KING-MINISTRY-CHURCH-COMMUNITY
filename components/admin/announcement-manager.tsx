'use client'

import { ImagePlus, Loader2, Megaphone, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/lib/storage-constants'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

const IMAGE_ACCEPT = ACCEPT_ATTRIBUTE.split(',')
  .filter((mime) => mime.startsWith('image/'))
  .join(',')

export type AdminAnnouncement = {
  id: string
  title: string
  body: string
  image: string | null
  audience: string
  ministryName: string | null
  pinned: boolean
  startsAt: string
  endsAt: string | null
}

/**
 * Writing and taking down announcements.
 *
 * The audience picker is the important control: choosing a department switches
 * the audience to MINISTRY automatically, because a departmental notice sent to
 * the whole church is exactly the noise this feature exists to avoid.
 */
export function AnnouncementManager({
  initial,
  ministries,
}: {
  initial: AdminAnnouncement[]
  ministries: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ministryId, setMinistryId] = useState('')
  const [design, setDesign] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function chooseDesign(file: File | null) {
    if (preview) URL.revokeObjectURL(preview)
    if (!file) {
      setDesign(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That design is too big — the limit is 8MB.')
      return
    }
    setError(null)
    setDesign(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const outgoing = new FormData()
    for (const key of ['title', 'body', 'startsAt', 'endsAt'] as const) {
      const value = form.get(key)
      if (typeof value === 'string' && value) outgoing.set(key, value)
    }
    outgoing.set('ministryId', ministryId)
    // A departmental notice is only ever for that department.
    outgoing.set('audience', ministryId ? 'MINISTRY' : String(form.get('audience') ?? 'MEMBERS'))
    outgoing.set('pinned', String(form.get('pinned') === 'on'))
    if (design) outgoing.set('design', design)

    try {
      const response = await fetch('/api/announcements', { method: 'POST', body: outgoing })
      const result = (await response.json()) as ApiResult<unknown>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setOpen(false)
      chooseDesign(null)
      setMinistryId('')
      if (fileInput.current) fileInput.current.value = ''
      router.refresh()
    } catch {
      setError('We could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Take this announcement down?')) return
    setBusy(true)
    try {
      await fetch(`/api/announcements?id=${id}`, { method: 'DELETE' })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl sm:text-3xl">
          <Megaphone className="size-6 text-primary" aria-hidden />
          Announcements
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {open ? <X className="size-5" aria-hidden /> : <Plus className="size-5" aria-hidden />}
          {open ? 'Cancel' : 'New announcement'}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-6 space-y-5 rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7"
        >
          {error && <Alert variant="error">{error}</Alert>}

          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">Title</span>
            <Input name="title" required maxLength={160} placeholder="Harvest service moved" />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">Notice</span>
            <textarea
              name="body"
              rows={5}
              required
              maxLength={6000}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">
                Who is it for
              </span>
              <select
                value={ministryId}
                onChange={(event) => setMinistryId(event.target.value)}
                className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
              >
                <option value="">The whole church</option>
                {ministries.map((ministry) => (
                  <option key={ministry.id} value={ministry.id}>
                    {ministry.name} only
                  </option>
                ))}
              </select>
            </label>

            {!ministryId && (
              <label className="block">
                <span className="mb-1.5 block font-display font-semibold text-foreground">
                  Visibility
                </span>
                <select
                  name="audience"
                  defaultValue="MEMBERS"
                  className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
                >
                  <option value="MEMBERS">Signed-in members</option>
                  <option value="PUBLIC">Anybody, including visitors</option>
                </select>
              </label>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">
                Show from
              </span>
              <Input name="startsAt" type="datetime-local" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">
                Stop showing
              </span>
              <span className="mb-1.5 block text-sm text-muted-foreground">
                Strongly recommended. A notice left up for months is noise.
              </span>
              <Input name="endsAt" type="datetime-local" />
            </label>
          </div>

          <div>
            <span className="mb-2 block font-display font-semibold text-foreground">
              Design (optional)
            </span>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL
              <img
                src={preview}
                alt="The design you chose"
                className="mb-3 max-h-56 rounded-2xl border-2 border-border object-contain"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
              >
                <ImagePlus className="size-5" aria-hidden />
                {design ? 'Choose another' : 'Attach a design'}
              </button>
              {design && (
                <button
                  type="button"
                  onClick={() => {
                    chooseDesign(null)
                    if (fileInput.current) fileInput.current.value = ''
                  }}
                  className="flex min-h-11 items-center rounded-xl px-3 font-semibold text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={IMAGE_ACCEPT}
              onChange={(event) => chooseDesign(event.target.files?.[0] ?? null)}
              className="hidden"
            />
          </div>

          <label className="flex items-start gap-3 rounded-2xl border-2 border-border p-4">
            <input
              type="checkbox"
              name="pinned"
              className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
            />
            <span className="font-display font-semibold text-foreground">
              Pin it to the top
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Post it
          </button>
        </form>
      )}

      {initial.length === 0 ? (
        <p className="mt-8 rounded-3xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center text-pretty text-muted-foreground">
          Nothing on the boards. Announcements appear on the home page and stop showing on their
          end date.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {initial.map((item) => (
            <li key={item.id}>
              <article
                className={cn(
                  'flex flex-wrap items-start justify-between gap-4 rounded-3xl border-2 bg-card p-6 shadow-soft',
                  item.pinned ? 'border-primary/35' : 'border-border',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-secondary-foreground">
                      {item.ministryName ?? (item.audience === 'PUBLIC' ? 'Public' : 'Members')}
                    </span>
                    {item.pinned && (
                      <span className="rounded-full bg-primary-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                        Pinned
                      </span>
                    )}
                    {item.image && (
                      <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-ink">
                        Has a design
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-lg font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                  {item.endsAt && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Until {new Date(item.endsAt).toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  disabled={busy}
                  className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 font-semibold text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                >
                  <Trash2 className="size-4" aria-hidden />
                  Take down
                </button>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
