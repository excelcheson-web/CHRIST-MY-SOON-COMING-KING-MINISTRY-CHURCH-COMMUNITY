'use client'

import { Eye, Loader2, Pencil, RotateCcw, Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

export type EditablePage = {
  slug: string
  href: string
  title: string
  subtitle: string
  content: string
  published: boolean
  source: 'database' | 'bundled'
  updatedAt: string | null
}

/**
 * Markdown editor for About, Founder and Doctrine.
 *
 * Write/Preview rather than a rich-text editor on purpose: the pages render
 * Markdown, so showing the same Markdown is honest about what will be saved.
 * A WYSIWYG that quietly produced different output would be worse.
 */
export function PageEditor({ page }: { page: EditablePage }) {
  const router = useRouter()
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [content, setContent] = useState(page.content)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    setBusy(true)
    setError(null)
    setSaved(null)

    try {
      const response = await fetch(`/api/admin/pages/${page.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          subtitle: form.get('subtitle'),
          content,
          published: form.get('published') === 'on',
        }),
      })
      const result = (await response.json()) as ApiResult<{ updatedAt: string }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      setSaved('Saved. The page is live.')
      router.refresh()
    } catch {
      setError('We could not reach the server. Your changes were not saved.')
    } finally {
      setBusy(false)
    }
  }

  async function revert() {
    if (
      !confirm(
        'Undo every change and go back to the wording this site was built with? This cannot be undone.',
      )
    ) {
      return
    }

    setBusy(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/pages/${page.slug}`, { method: 'DELETE' })
      if (!response.ok) {
        setError('Could not revert that page.')
        return
      }
      router.refresh()
      // Server data changed underneath the textarea; reload so it matches.
      window.location.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}
      {saved && <Alert variant="success">{saved}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {page.source === 'database' ? (
            <>
              Edited here
              {page.updatedAt &&
                ` · last saved ${new Date(page.updatedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}`}
            </>
          ) : (
            'Still showing the wording this site was built with.'
          )}
        </p>
        <Link
          href={page.href}
          target="_blank"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          View the live page ↗
        </Link>
      </div>

      <label className="block">
        <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
          Page title
        </span>
        <Input name="title" defaultValue={page.title} required maxLength={140} />
      </label>

      <label className="block">
        <span className="mb-1.5 block font-display text-base font-semibold text-foreground">
          Subtitle
        </span>
        <span className="mb-1.5 block text-sm text-muted-foreground">
          The line under the title on the page header.
        </span>
        <Input name="subtitle" defaultValue={page.subtitle} maxLength={300} />
      </label>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-display text-base font-semibold text-foreground">Page content</span>
          <div className="flex gap-1 rounded-xl border-2 border-border bg-card p-1">
            {(['write', 'preview'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={cn(
                  'flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors',
                  tab === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                {value === 'write' ? (
                  <Pencil className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
                {value === 'write' ? 'Write' : 'Preview'}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-2 text-sm text-muted-foreground">
          <strong>##</strong> starts a section · <strong>###</strong> a sub-heading ·{' '}
          <strong>-</strong> a bullet · <strong>**bold**</strong> · <strong>&gt;</strong> a quote
        </p>

        {tab === 'write' ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={26}
            required
            className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 font-mono text-sm leading-relaxed"
          />
        ) : (
          <div className="min-h-[30rem] rounded-xl border-2 border-border bg-card p-6">
            <MarkdownPreview source={content} />
          </div>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
        <input
          type="checkbox"
          name="published"
          defaultChecked={page.published}
          className="mt-0.5 size-6 shrink-0 rounded border-2 border-input"
        />
        <span>
          <span className="block font-display font-semibold text-foreground">Visible to visitors</span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            Untick and the page falls back to the wording this site was built with.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          Save changes
        </Button>

        {page.source === 'database' && (
          <Button type="button" variant="ghost" size="lg" onClick={revert} disabled={busy}>
            <RotateCcw aria-hidden />
            Undo all my edits
          </Button>
        )}
      </div>
    </form>
  )
}

/**
 * A deliberately small Markdown renderer for the preview pane.
 *
 * The live page uses react-markdown; pulling that into the editor would double
 * the admin bundle for a preview. This covers the syntax the hint line above
 * actually promises, and the "View the live page" link is there for certainty.
 */
function MarkdownPreview({ source }: { source: string }) {
  const blocks = source.split(/\n{2,}/)

  return (
    <div className="prose-church">
      {blocks.map((block, index) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        if (trimmed.startsWith('### ')) {
          return <h3 key={index}>{trimmed.slice(4)}</h3>
        }
        if (trimmed.startsWith('## ')) {
          return <h2 key={index}>{trimmed.slice(3)}</h2>
        }
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={index}>
              <p>{inline(trimmed.replace(/^> ?/gm, ''))}</p>
            </blockquote>
          )
        }
        if (/^[-*] /.test(trimmed)) {
          return (
            <ul key={index}>
              {trimmed.split('\n').map((line, i) => (
                <li key={i}>{inline(line.replace(/^[-*] /, ''))}</li>
              ))}
            </ul>
          )
        }
        return <p key={index}>{inline(trimmed)}</p>
      })}
    </div>
  )
}

/** Bold and italic only — enough to make the preview representative. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    return part
  })
}
