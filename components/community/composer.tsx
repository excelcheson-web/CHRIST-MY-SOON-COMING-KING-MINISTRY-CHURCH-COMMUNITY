'use client'

import { ImagePlus, Loader2, Send, X } from 'lucide-react'
import { useRef, useState } from 'react'

import { Alert } from '@/components/ui/alert'
import { postTypeEmoji, postTypeLabels, visibilityLabels, type FeedPost } from '@/lib/community-display'
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from '@/lib/storage-constants'
import { cn } from '@/lib/utils'
import type { ApiResult } from '@/types'

const types = ['GENERAL', 'PRAYER', 'TESTIMONY', 'QUESTION', 'ENCOURAGEMENT'] as const
const IMAGE_ACCEPT = ACCEPT_ATTRIBUTE.split(',')
  .filter((mime) => mime.startsWith('image/'))
  .join(',')

export function Composer({
  ministries,
  smallGroups,
  onPosted,
}: {
  ministries: { id: string; name: string }[]
  smallGroups: { id: string; name: string }[]
  onPosted: (post: FeedPost) => void
}) {
  const [body, setBody] = useState('')
  const [type, setType] = useState<(typeof types)[number]>('GENERAL')
  const [visibility, setVisibility] = useState('MEMBERS')
  const [scopeId, setScopeId] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Scoped options only appear when the person actually belongs somewhere.
  const scopeOptions =
    visibility === 'MINISTRY' ? ministries : visibility === 'SMALL_GROUP' ? smallGroups : []

  function pickImage(file: File | null) {
    if (preview) URL.revokeObjectURL(preview)

    if (!file) {
      setImage(null)
      setPreview(null)
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That picture is too big — the limit is 8MB.')
      setImage(null)
      setPreview(null)
      return
    }

    setError(null)
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  async function submit() {
    const text = body.trim()
    if (!text) return

    setBusy(true)
    setError(null)

    try {
      /*
       * Multipart only when there is a picture. A plain text post is by far the
       * common case, and JSON keeps that path simple on both ends.
       */
      let response: Response
      if (image) {
        const form = new FormData()
        form.set('body', text)
        form.set('type', type)
        form.set('visibility', visibility)
        if (visibility === 'MINISTRY') form.set('ministryId', scopeId)
        if (visibility === 'SMALL_GROUP') form.set('smallGroupId', scopeId)
        if (videoUrl.trim()) form.set('videoUrl', videoUrl.trim())
        form.set('image', image)

        response = await fetch('/api/community/posts', { method: 'POST', body: form })
      } else {
        response = await fetch('/api/community/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: text,
            type,
            visibility,
            ministryId: visibility === 'MINISTRY' ? scopeId : undefined,
            smallGroupId: visibility === 'SMALL_GROUP' ? scopeId : undefined,
            videoUrl: videoUrl.trim() || undefined,
          }),
        })
      }

      const result = (await response.json()) as ApiResult<FeedPost>
      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Something went wrong.' : result.error)
        return
      }

      onPosted(result.data)
      setBody('')
      setVideoUrl('')
      pickImage(null)
      if (fileInput.current) fileInput.current.value = ''
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-7">
      <h2 className="text-xl">Share something</h2>

      {error && (
        <Alert variant="error" className="mt-4">
          {error}
        </Alert>
      )}

      <label className="mt-5 block">
        <span className="sr-only">What would you like to say?</span>
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="What is on your heart today?"
          className="w-full rounded-2xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
          What kind of post is this?
        </legend>
        <div className="flex flex-wrap gap-2">
          {types.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setType(value)}
              aria-pressed={type === value}
              className={cn(
                'flex min-h-11 items-center gap-1.5 rounded-xl border-2 px-4 font-semibold transition-colors',
                type === value
                  ? 'border-primary/35 bg-primary-soft text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/25 hover:text-foreground',
              )}
            >
              <span aria-hidden>{postTypeEmoji[value]}</span>
              {postTypeLabels[value]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Who can see it
          </span>
          <select
            value={visibility}
            onChange={(event) => {
              setVisibility(event.target.value)
              setScopeId('')
            }}
            className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
          >
            <option value="MEMBERS">{visibilityLabels.MEMBERS}</option>
            <option value="PUBLIC">{visibilityLabels.PUBLIC}</option>
            {ministries.length > 0 && (
              <option value="MINISTRY">{visibilityLabels.MINISTRY}</option>
            )}
            {smallGroups.length > 0 && (
              <option value="SMALL_GROUP">{visibilityLabels.SMALL_GROUP}</option>
            )}
          </select>
        </label>

        {scopeOptions.length > 0 && (
          <label className="block">
            <span className="mb-1.5 block font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Which one
            </span>
            <select
              value={scopeId}
              onChange={(event) => setScopeId(event.target.value)}
              className="h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
            >
              <option value="">Choose…</option>
              {scopeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {preview && (
        <div className="relative mt-4 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, never a served asset */}
          <img
            src={preview}
            alt="The picture you chose"
            className="max-h-56 rounded-2xl border-2 border-border object-cover"
          />
          <button
            type="button"
            onClick={() => {
              pickImage(null)
              if (fileInput.current) fileInput.current.value = ''
            }}
            className="absolute -right-3 -top-3 grid size-9 place-items-center rounded-full bg-destructive text-destructive-foreground shadow-lifted"
          >
            <X className="size-5" aria-hidden />
            <span className="sr-only">Remove the picture</span>
          </button>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-border px-4 font-semibold text-muted-foreground transition-colors hover:border-primary/25 hover:text-foreground"
        >
          <ImagePlus className="size-5" aria-hidden />
          Picture
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={IMAGE_ACCEPT}
          onChange={(event) => pickImage(event.target.files?.[0] ?? null)}
          className="hidden"
        />

        <label className="min-w-48 flex-1">
          <span className="sr-only">Video link</span>
          <input
            type="url"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="Paste a YouTube link (optional)"
            className="h-12 w-full rounded-xl border-2 border-input bg-card px-4 text-base text-foreground"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          disabled={busy || !body.trim()}
          className="flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-display font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-5" aria-hidden />
          )}
          Post
        </button>
      </div>
    </div>
  )
}
