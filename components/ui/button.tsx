import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Every size below is >= 48px tall so it stays an easy target for small hands
 * and for anyone on a phone. `sm` is the one exception and is reserved for
 * dense admin surfaces, never for public navigation.
 */
const buttonVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl',
    'font-display text-base font-semibold',
    'transition-all duration-200 ease-out',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:size-5 [&_svg]:shrink-0',
    'active:scale-[0.98] motion-reduce:active:scale-100',
  ),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 hover:shadow-glow',
        accent: 'bg-accent-gradient text-accent-foreground shadow-soft hover:brightness-105 hover:shadow-lifted',
        outline:
          'border-2 border-primary/25 bg-card text-primary shadow-soft hover:border-primary/50 hover:bg-primary-soft',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'text-foreground hover:bg-secondary hover:text-secondary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        destructive:
          'bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90',
      },
      size: {
        default: 'h-12 px-6 py-3',
        lg: 'h-14 px-8 text-lg',
        xl: 'h-16 px-10 text-lg sm:text-xl',
        sm: 'h-10 rounded-lg px-4 text-sm',
        icon: 'size-12 rounded-xl',
      },
      block: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
