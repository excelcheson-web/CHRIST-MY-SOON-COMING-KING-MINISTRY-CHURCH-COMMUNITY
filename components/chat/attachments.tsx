'use client'

import { FileText, X } from 'lucide-react'

import { cn } from '@/lib/utils'

export type ChatAttachment = {
  id: string
  fileName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
}

export function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/** Files hanging off a sent message. */
export function AttachmentList({
  attachments,
  onOwnBubble,
}: {
  attachments: ChatAttachment[]
  onOwnBubble: boolean
}) {
  if (attachments.length === 0) return null

  return (
    <ul className="mt-2 space-y-2">
      {attachments.map((file) => {
        const href = `/api/chat/attachments/${file.id}`
        const isImage = file.mimeType.startsWith('image/')

        return (
          <li key={file.id}>
            {isImage ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- authenticated route, not an optimisable static asset */}
                <img
                  src={href}
                  alt={file.fileName}
                  width={file.width ?? undefined}
                  height={file.height ?? undefined}
                  loading="lazy"
                  className="max-h-72 w-auto max-w-full rounded-xl border border-black/10 bg-card object-contain"
                />
              </a>
            ) : (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-colors',
                  onOwnBubble
                    ? 'border-primary-foreground/30 bg-primary-foreground/10 hover:bg-primary-foreground/20'
                    : 'border-border bg-card hover:bg-secondary',
                )}
              >
                <FileText className="size-6 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{file.fileName}</span>
                  <span className="block text-xs opacity-80">{formatBytes(file.size)}</span>
                </span>
              </a>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Files staged in the composer, before the message is sent. */
export function PendingAttachments({
  files,
  onRemove,
}: {
  files: ChatAttachment[]
  onRemove: (id: string) => void
}) {
  if (files.length === 0) return null

  return (
    <ul className="mb-3 flex flex-wrap gap-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="flex items-center gap-2 rounded-xl border-2 border-border bg-secondary px-3 py-2"
        >
          <FileText className="size-4 shrink-0 text-accent-ink" aria-hidden />
          <span className="max-w-[12rem] truncate text-sm font-semibold">{file.fileName}</span>
          <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="grid size-8 shrink-0 place-items-center rounded-lg hover:bg-card"
            aria-label={`Remove ${file.fileName}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  )
}
