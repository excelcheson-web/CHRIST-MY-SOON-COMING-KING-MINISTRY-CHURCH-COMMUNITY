import type { Metadata } from 'next'
import Link from 'next/link'
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

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string }
}) {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  /*
   * Somebody sent here from the community section did not choose to sign in —
   * they clicked "Community" and were bounced. Saying why, and offering the
   * register link in the same breath, turns a locked door into the front door.
   *
   * Only ever read as a prefix, never rendered: a callbackUrl is attacker-
   * controllable, so putting it on the page would be a small XSS waiting for
   * somebody to widen it.
   */
  const fromCommunity = searchParams.callbackUrl?.startsWith('/community') ?? false

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Welcome back</h1>
      <p className="mt-3 text-pretty text-lg text-muted-foreground">
        Sign in to pick up where you left off.
      </p>

      {fromCommunity && (
        <div className="mt-6 rounded-2xl border-2 border-primary/25 bg-primary-soft/50 p-5">
          <p className="font-display font-bold text-foreground">
            The community is for members
          </p>
          <p className="mt-1.5 text-pretty text-muted-foreground">
            The feed, the member directory, the groups and the help board are all behind
            this door — so what people share there stays inside the church family.{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Creating an account
            </Link>{' '}
            takes less than a minute and it is free.
          </p>
        </div>
      )}

      <div className="mt-8">
        {/* LoginForm reads ?callbackUrl, so it needs a Suspense boundary. */}
        <Suspense fallback={<FormFallback />}>
          <LoginForm googleEnabled={isGoogleEnabled} />
        </Suspense>
      </div>
    </div>
  )
}
