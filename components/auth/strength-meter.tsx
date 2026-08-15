'use client'

import { passwordStrength } from '@/lib/validations'
import { cn } from '@/lib/utils'

const strengthColours = ['bg-border', 'bg-destructive', 'bg-accent', 'bg-success'] as const

/**
 * Three bars and a word, under a password box.
 *
 * Lived inside `register-form.tsx` until the change-password form needed the
 * same thing. Somebody choosing a new password deserves the same feedback as
 * somebody choosing a first one, and two copies of a meter is how the two
 * quietly drift apart.
 *
 * The bars are `aria-hidden` and the label is a polite live region: a screen
 * reader should hear "strong", not three anonymous rectangles.
 */
export function StrengthMeter({ value }: { value: string }) {
  const { score, label } = passwordStrength(value)

  return (
    <div className="pt-1">
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              score >= step ? strengthColours[score] : 'bg-border',
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground" aria-live="polite">
        {label}
      </p>
    </div>
  )
}
