import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { LoginForm } from '@/components/auth/login-form'
import { auth, isGoogleEnabled } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your Christ My Soon Coming King Ministry account.',
  robots: { index: false, follow: true },
}

function FormFallback() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="h-20 animate-pulse rounded-xl bg-muted" />
      <div className="h-14 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}

export default async function LoginPage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Welcome back</h1>
      <p className="mt-3 text-pretty text-lg text-muted-foreground">
        Sign in to pick up where you left off.
      </p>

      <div className="mt-8">
        {/* LoginForm reads ?callbackUrl, so it needs a Suspense boundary. */}
        <Suspense fallback={<FormFallback />}>
          <LoginForm googleEnabled={isGoogleEnabled} />
        </Suspense>
      </div>
    </div>
  )
}
