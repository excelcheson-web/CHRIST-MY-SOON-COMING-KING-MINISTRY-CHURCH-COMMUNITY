'use client'

import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] unhandled error:', error)
  }, [error])

  return (
    <div className="container flex min-h-dvh flex-col items-center justify-center py-20 text-center">
      <h1 className="text-4xl sm:text-5xl">Something went wrong</h1>
      <p className="mt-5 max-w-lg text-pretty text-lg text-muted-foreground">
        Sorry about that. Please try again — and if it keeps happening, let the church office know.
      </p>

      <div className="mt-9 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={reset}>
          <RefreshCw aria-hidden />
          Try again
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/">Go to the homepage</Link>
        </Button>
      </div>

      {error.digest && (
        <p className="mt-8 text-sm text-muted-foreground">
          Reference code: <code>{error.digest}</code>
        </p>
      )}
    </div>
  )
}
