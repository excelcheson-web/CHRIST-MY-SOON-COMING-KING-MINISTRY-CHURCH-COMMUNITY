import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { RegisterForm } from '@/components/auth/register-form'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Join us',
  description: 'Create your free Christ My Soon Coming King Ministry account — it takes less than a minute.',
  robots: { index: false, follow: true },
}

export default async function RegisterPage() {
  const session = await auth()
  if (session?.user) redirect('/dashboard')

  /*
   * Departments, offered as an optional dropdown. Failing to load them simply
   * hides that one field — it must never stop somebody creating an account.
   */
  const ministries = prisma
    ? await prisma.ministry
        .findMany({
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: { id: true, name: true },
        })
        .catch(() => [])
    : []

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Join the family</h1>
      <p className="mt-3 text-pretty text-lg text-muted-foreground">
        Four short questions and you are in. Everything is free.
      </p>

      <div className="mt-8">
        <RegisterForm ministries={ministries} />
      </div>
    </div>
  )
}
