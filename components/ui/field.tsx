import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Label + control + hint + error, wired together with the aria attributes that
 * make a form usable with a screen reader. Errors are announced politely rather
 * than assertively so a keystroke does not interrupt what is being read.
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: (props: {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
  }) => ReactNode
  className?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id}>{label}</Label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy })}

      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
