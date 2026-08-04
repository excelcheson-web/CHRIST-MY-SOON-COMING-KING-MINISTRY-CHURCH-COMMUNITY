'use client'

import { LogIn, LogOut, MessageCircle, Settings, ShieldCheck, UserPlus } from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { cn, initials } from '@/lib/utils'

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('h-12 animate-pulse rounded-xl bg-muted', className)}
    />
  )
}

/**
 * The only part of the header that depends on who is signed in. Keeping it
 * client-side lets every public page stay statically rendered.
 */
export function AuthNav({
  variant = 'bar',
  onNavigate,
}: {
  variant?: 'bar' | 'drawer'
  onNavigate?: () => void
}) {
  const { data: session, status } = useSession()
  const isDrawer = variant === 'drawer'

  if (status === 'loading') {
    return (
      <div className={cn('flex gap-2', isDrawer && 'flex-col')}>
        <Skeleton className={isDrawer ? 'w-full' : 'w-24'} />
        <Skeleton className={isDrawer ? 'w-full' : 'w-28'} />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className={cn('flex items-center gap-2', isDrawer && 'flex-col gap-3')}>
        <Button asChild variant="ghost" block={isDrawer} onClick={onNavigate}>
          <Link href="/login">
            <LogIn aria-hidden />
            Sign in
          </Link>
        </Button>
        <Button asChild variant="default" block={isDrawer} onClick={onNavigate}>
          <Link href="/register">
            <UserPlus aria-hidden />
            Join us
          </Link>
        </Button>
      </div>
    )
  }

  const user = session.user
  const firstName = user.name?.split(' ')[0] ?? 'Friend'

  /*
   * On the bar these are icons with `sr-only` labels, and that is not a
   * stylistic choice — the header has to fit the brand, eight navigation items
   * and this cluster on one row from 1280px up, and with labels it does not.
   * It overflowed the viewport at every laptop width between 1280 and 1512.
   *
   * `title` gives sighted mouse users the same word the screen reader gets, so
   * nothing is lost but the horizontal space.
   */
  const label = (text: string) => (
    <span className={isDrawer ? '' : 'sr-only'}>{text}</span>
  )

  return (
    <div className={cn('flex items-center gap-2', isDrawer && 'w-full flex-col gap-3')}>
      <Button asChild variant="ghost" size={isDrawer ? 'default' : 'icon'} block={isDrawer} onClick={onNavigate}>
        <Link href="/chat" title={isDrawer ? undefined : 'Chat'}>
          <MessageCircle aria-hidden />
          {label('Chat')}
        </Link>
      </Button>

      <Button asChild variant="ghost" size={isDrawer ? 'default' : 'icon'} block={isDrawer} onClick={onNavigate}>
        <Link href="/account/security" title={isDrawer ? undefined : 'Security'}>
          <ShieldCheck aria-hidden />
          {label('Security')}
        </Link>
      </Button>

      {user.role === 'ADMIN' && (
        <Button asChild variant="ghost" size={isDrawer ? 'default' : 'icon'} block={isDrawer} onClick={onNavigate}>
          {/* Deliberately not another shield. Two identical icon-only buttons
              side by side are two buttons nobody can tell apart. */}
          <Link href="/admin" title={isDrawer ? undefined : 'Admin'}>
            <Settings aria-hidden />
            {label('Admin')}
          </Link>
        </Button>
      )}

      <Button asChild variant="outline" block={isDrawer} onClick={onNavigate}>
        <Link href="/dashboard" title={isDrawer ? undefined : `${firstName} — your dashboard`}>
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          >
            {initials(user.name ?? 'Friend')}
          </span>
          {/*
            The name comes back at 3xl (1800px), not 2xl (1600px). At exactly
            1600 the container stops growing while the navigation icons switch
            on, so the row is at its tightest there — and the name is the one
            item here whose width depends on the member rather than on us.
            Above 1800 the container is capped and centred, so there is 200px
            of slack down each side and no name can overflow anything.
          */}
          <span className={cn('max-w-[9rem] truncate', !isDrawer && 'hidden 3xl:inline')}>
            {firstName}
          </span>
          {!isDrawer && <span className="sr-only 3xl:hidden">{firstName} — your dashboard</span>}
        </Link>
      </Button>

      <Button
        variant="ghost"
        size={isDrawer ? 'default' : 'icon'}
        block={isDrawer}
        title={isDrawer ? undefined : 'Sign out'}
        onClick={() => {
          onNavigate?.()
          void signOut({ callbackUrl: '/' })
        }}
      >
        <LogOut aria-hidden />
        {label('Sign out')}
      </Button>
    </div>
  )
}
