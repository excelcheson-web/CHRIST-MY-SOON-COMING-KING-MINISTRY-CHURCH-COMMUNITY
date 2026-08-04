'use client'

import * as React from 'react'
import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      'peer size-7 shrink-0 rounded-md border-2 border-input bg-card shadow-sm transition-colors',
      'hover:border-primary/60',
      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
      'aria-[invalid=true]:border-destructive',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="size-5" strokeWidth={3} aria-hidden />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
