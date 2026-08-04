import { ShieldCheck } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { TwoFactorSetup } from '@/components/account/two-factor-setup'
import { Alert } from '@/components/ui/alert'
import { requireUser } from '@/lib/auth'
import { canAccessAdminArea, roleLabels } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Security',
  robots: { index: false, follow: false },
}

export default async function SecurityPage() {
  const user = await requireUser('/account/security')
  if (!prisma) notFound()

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { twoFactorEnabledAt: true, twoFactorRecovery: true },
  })

  const enabled = Boolean(account?.twoFactorEnabledAt)

  return (
    <div className="container py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-royal-gradient text-primary-foreground">
            <ShieldCheck className="size-8" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.16em] text-primary">
              {roleLabels[user.role]}
            </p>
            <h1 className="mt-1 text-3xl sm:text-4xl">Security</h1>
          </div>
        </div>

        {canAccessAdminArea(user.role) && !enabled && (
          <Alert variant="info" className="mt-8">
            Your account can reach private prayer requests and members&apos; contact details.
            Please switch this on.
          </Alert>
        )}

        <section aria-labelledby="two-factor" className="mt-10">
          <h2 id="two-factor" className="text-2xl">
            Two-factor authentication
          </h2>

          <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6 shadow-soft sm:p-8">
            <TwoFactorSetup
              enabled={enabled}
              enabledAt={account?.twoFactorEnabledAt?.toISOString() ?? null}
              recoveryRemaining={account?.twoFactorRecovery.length ?? 0}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
