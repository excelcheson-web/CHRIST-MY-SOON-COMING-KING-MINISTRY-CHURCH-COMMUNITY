import type { Metadata } from 'next'
import Link from 'next/link'

import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  /*
   * Never indexed and never followed.
   *
   * The URL carries a live password-reset token. `follow: false` matters as
   * much as `index: false` here — a crawler that followed links out of this
   * page could carry the token in a Referer header to wherever it went next.
   */
  title: 'Choose a new password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const token = searchParams.token?.trim() ?? ''

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Something is missing</h1>
        <div className="mt-8 space-y-6">
          <Alert variant="error">
            That link has no code in it. It may have been cut short by your email app — some clients
            break long links across two lines.
          </Alert>
          <Button asChild size="lg" block>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      </div>
    )
  }

  /*
   * The token is not checked here.
   *
   * Validating on render would mean spending a database lookup on every crawler
   * and link-preview bot that touches the URL, and — worse — some email clients
   * and security scanners *pre-fetch* links, which for a single-use token means
   * the person's link is dead before they click it. The check happens when the
   * form is submitted, which is the first moment a human is definitely present.
   */
  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Choose a new password</h1>
      <p className="mt-3 text-pretty text-lg text-muted-foreground">
        Pick something only you know. You will use it the next time you sign in.
      </p>

      <div className="mt-8">
        <ResetPasswordForm token={token} />
      </div>
    </div>
  )
}
