'use client'

import { Layers, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import type { ApiResult } from '@/types'

export type SeriesRow = {
  id: string
  slug: string
  title: string
  isActive: boolean
  _count: { sermons: number }
}

/**
 * Series live on the sermons admin page rather than a screen of their own.
 *
 * A series is only ever created in the middle of adding a sermon — sending
 * someone to a separate page to make one, then back again, loses the form they
 * were half way through filling in.
 */
export function SeriesManager({ series }: { series: SeriesRow[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/sermons/series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          startDate: form.get('startDate') || undefined,
          endDate: form.get('endDate') || undefined,
          isActive: true,
        }),
      })
      const result = (await response.json()) as ApiResult<{ slug: string }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setOpen(false)
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-2xl sm:text-3xl">
          <Layers className="size-6 text-primary" aria-hidden />
          Series
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-primary/25 px-4 font-semibold text-primary transition-colors hover:bg-primary-soft"
        >
          <Plus className="size-4" aria-hidden />
          {open ? 'Cancel' : 'New series'}
        </button>
      </div>

      {open && (
        <form
          onSubmit={submit}
          className="mt-5 space-y-5 rounded-3xl border-2 border-border bg-card p-6 shadow-soft"
        >
          {error && <Alert variant="error">{error}</Alert>}

          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">Title</span>
            <Input name="title" required placeholder="e.g. Walking through Romans" />
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display font-semibold text-foreground">
              What it is about
            </span>
            <textarea
              name="description"
              rows={3}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">
                Starts (optional)
              </span>
              <Input name="startDate" type="date" />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-display font-semibold text-foreground">
                Ends (optional)
              </span>
              <Input name="endDate" type="date" />
            </label>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
            Create series
          </button>
        </form>
      )}

      {series.length === 0 ? (
        <p className="mt-5 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-6 text-muted-foreground">
          No series yet. A series groups sermons that belong together — like six weeks in one book.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {series.map((item) => (
            <li key={item.id}>
              <Link
                href={`/sermons?series=${item.slug}`}
                className="flex h-full flex-col rounded-2xl border-2 border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <span className="font-display font-bold text-foreground">{item.title}</span>
                <span className="mt-1 text-sm text-muted-foreground">
                  {item._count.sermons} {item._count.sermons === 1 ? 'sermon' : 'sermons'}
                  {!item.isActive && ' · finished'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
