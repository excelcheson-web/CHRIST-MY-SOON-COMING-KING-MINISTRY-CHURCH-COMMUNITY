'use client'

import { Eye, EyeOff } from 'lucide-react'
import * as React from 'react'

import { Input, type InputProps } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Password box with a show/hide toggle — fewer typos, fewer failed sign-ins. */
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn('pr-16', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
          <span className="sr-only">{visible ? 'Hide password' : 'Show password'}</span>
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'
