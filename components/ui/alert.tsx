import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

import { cn } from '@/lib/utils'

const alertVariants = cva(
  'flex items-start gap-3 rounded-2xl border-2 p-4 text-base sm:p-5 [&_svg]:mt-0.5 [&_svg]:size-6 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        info: 'border-primary/25 bg-primary-soft text-foreground [&_svg]:text-primary',
        success: 'border-success/30 bg-success/10 text-foreground [&_svg]:text-success',
        error: 'border-destructive/35 bg-destructive/10 text-foreground [&_svg]:text-destructive',
      },
    },
    defaultVariants: { variant: 'info' },
  },
)

const icons = {
  info: Info,
  success: CheckCircle2,
  error: AlertCircle,
} as const

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

export function Alert({ className, variant = 'info', children, ...props }: AlertProps) {
  const Icon = icons[variant ?? 'info']
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <Icon aria-hidden />
      <div className="text-pretty">{children}</div>
    </div>
  )
}
