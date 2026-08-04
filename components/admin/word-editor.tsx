'use client'

import { Loader2, RotateCcw, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

export type WordDay = {
  date: string
  title: string
  body: string
  reference: string | null
  author: string | null
  /** False when this is the bundled rotation rather than something written. */
  written: boolean
}

/**
 * Writing the pastor's word for a day.
 *
 * The form opens pre-filled with whatever is currently showing — including the
 * bundled rotation — so writing one is editing a draft rather than facing a
 * blank box. "Use the automatic word" deletes the row and the rotation takes
 * over again, which is why deleting is safe.
 */
export function WordEditor({ initial, defaultAuthor }: { initial: WordDay; defaultAuthor: string }) {
  const router = useRouter()
  const [date, setDate] = useState(initial.date)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(null)

    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/pastors-word', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showOn: form.get('showOn'),
          title: form.get('title'),
          body: form.get('body'),
          reference: form.get('reference'),
          author: form.get('author'),
        }),
      })
      const result = (await response.json()) as ApiResult<unknown>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setSaved('Saved. This is what the home page will show that day.')
      router.refresh()
    } catch {
      setError('We could not reach the server.')
    } finally {
      setBusy(false)
    }
  }

  async function revert() {
    if (!confirm('Go back to the automatic word for this day?')) return
    setBusy(true)
    try {
      await fetch(`/api/pastors-word?date=${date}`, { method: 'DELETE' })
      setSaved('Back to the automatic word for that day.')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{saved}</Alert>}

      <Alert variant="info">
        {initial.written
          ? 'A word has been written for this day. Edit it below, or go back to the automatic one.'
          : 'Nothing has been written for this day, so the home page is showing the automatic word below. Edit it and save to make it yours.'}
      </Alert>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">Which day</span>
        <Input
          name="showOn"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
        <span className="mt-1.5 block text-sm text-muted-foreground">
          You can write a week ahead in one sitting.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">Heading</span>
        <Input name="title" defaultValue={initial.title} required maxLength={140} />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display font-semibold text-foreground">The word</span>
        <span className="mb-1.5 block text-sm text-muted-foreground">
          Leave a blank line between paragraphs.
        </span>
        <textarea
          name="body"
          rows={9}
          defaultValue={initial.body}
          required
          maxLength={4000}
          className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-display font-semibold text-foreground">
            Scripture (optional)
          </span>
          <Input
            name="reference"
            defaultValue={initial.reference ?? ''}
            maxLength={120}
            placeholder="Psalm 34:18"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display font-semibold text-foreground">Signed</span>
          <Input
            name="author"
            defaultValue={initial.author ?? defaultAuthor}
            maxLength={120}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
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
          Save this word
        </button>

        {initial.written && (
          <button
            type="button"
            onClick={revert}
            disabled={busy}
            className="flex min-h-14 items-center gap-2 rounded-xl border-2 border-border px-6 font-display font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <RotateCcw className="size-5" aria-hidden />
            Use the automatic word
          </button>
        )}
      </div>
    </form>
  )
}
