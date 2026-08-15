import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Forgotten password',
  description: 'Send yourself a link to choose a new password.',
  // Followable so the link from /login is not a dead end for a crawler, but
  // never indexed — nobody should arrive here from a search result.
  robots: { index: false, follow: true },
}

export default async function ForgotPasswordPage() {
  // Somebody already signed in does not need this; the Security page is the
  // right place to change a password you still know.
  const session = await auth()
  if (session?.user) redirect('/account/security')

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Forgotten your password?</h1>
      <p className="mt-3 text-pretty text-lg text-muted-foreground">
        It happens. Give us the email you signed up with and we will send you a link to choose a new
        one.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  )
}
