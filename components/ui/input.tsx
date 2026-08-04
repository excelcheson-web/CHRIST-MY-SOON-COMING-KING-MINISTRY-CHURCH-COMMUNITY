import * as React from 'react'

import { cn } from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

/**
 * Deliberately tall (56px) with 17px text: big enough to tap accurately and
 * large enough that iOS never zooms the viewport on focus.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-14 w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground shadow-sm',
        'placeholder:text-muted-foreground',
        'transition-colors duration-150',
        'hover:border-primary/40',
        'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-60',
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/25',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
