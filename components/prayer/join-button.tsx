'use client'

import { Check, Loader2, LogIn, UserPlus } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import type { ApiResult } from '@/types'

export function JoinGroupButton({
  slug,
  isMember,
  isPublic,
}: {
  slug: string
  isMember: boolean
  isPublic: boolean
}) {
  const { status } = useSession()
  const router = useRouter()
  const [joined, setJoined] = useState(isMember)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return <div aria-hidden className="h-12 w-32 animate-pulse rounded-xl bg-muted" />
  }

  if (status !== 'authenticated') {
    return (
      <Button asChild variant="outline">
        <Link href={`/login?callbackUrl=${encodeURIComponent(`/prayer/groups/${slug}`)}`}>
          <LogIn aria-hidden />
          Sign in to join
        </Link>
      </Button>
    )
  }

  if (!isPublic && !joined) {
    return (
      <p className="text-sm font-semibold text-muted-foreground">
        Invite only — speak to the prayer team
      </p>
    )
  }

  async function toggle() {
    setBusy(true)
    setError(null)
    const target = !joined

    try {
      const response = await fetch(`/api/prayer/groups/${slug}/membership`, {
        method: target ? 'POST' : 'DELETE',
      })
      const result = (await response.json()) as ApiResult<{ joined: boolean }>

      if (!response.ok || !result.ok) {
        setError(result.ok ? 'Could not do that.' : result.error)
        return
      }

      setJoined(result.data.joined)
      router.refresh()
    } catch {
      setError('We could not reach the server. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <Button onClick={toggle} disabled={busy} variant={joined ? 'outline' : 'default'}>
        {busy ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : joined ? (
          <Check aria-hidden />
        ) : (
          <UserPlus aria-hidden />
        )}
        {joined ? 'You are in — tap to leave' : 'Join this group'}
      </Button>
      {error && <p className="mt-2 text-sm font-semibold text-destructive">{error}</p>}
    </div>
  )
}
