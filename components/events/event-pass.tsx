import { CalendarDays, MapPin, Users } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The pass someone shows at the door.
 *
 * Built to survive a bad phone and a dark foyer: the QR is large and high
 * contrast, and the six-character code is printed underneath at a readable size
 * because plenty of volunteers will end up typing it instead of scanning.
 */
export function EventPass({
  title,
  when,
  where,
  qrDataUrl,
  code,
  guests,
  waitlisted,
  waitlistPosition,
}: {
  title: string
  when: string
  where: string | null
  qrDataUrl: string
  code: string
  guests: number
  waitlisted: boolean
  waitlistPosition: number | null
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-3xl border-2 bg-card shadow-lifted',
        waitlisted ? 'border-accent/40' : 'border-primary/25',
      )}
    >
      <div
        className={cn(
          'px-6 py-5 text-center sm:px-8',
          waitlisted ? 'bg-accent-soft' : 'bg-royal-gradient',
        )}
      >
        <p
          className={cn(
            'font-display text-sm font-bold uppercase tracking-[0.18em]',
            waitlisted ? 'text-accent-ink' : 'text-accent',
          )}
        >
          {waitlisted ? 'On the waitlist' : 'Your pass'}
        </p>
        <p
          className={cn(
            'mt-2 font-display text-xl font-extrabold',
            waitlisted ? 'text-foreground' : 'text-white',
          )}
        >
          {title}
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {waitlisted ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-6 text-center">
            <p className="font-display text-3xl font-extrabold text-foreground">
              #{waitlistPosition ?? '—'}
            </p>
            <p className="mt-2 text-pretty text-muted-foreground">
              in the queue. If a place opens up we will confirm you automatically and email your
              pass.
            </p>
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-[16rem] rounded-2xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- data URI, no loader needed */}
              <img
                src={qrDataUrl}
                alt={`QR code for your booking. If it will not scan, give this code instead: ${code}`}
                className="block h-auto w-full"
                width={512}
                height={512}
              />
            </div>

            <div className="mt-5 text-center">
              <p className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Or give this code
              </p>
              <p className="mt-1 font-display text-3xl font-extrabold tracking-[0.28em] text-primary">
                {code}
              </p>
            </div>
          </>
        )}

        <dl className="mt-7 space-y-3 border-t border-border pt-6 text-sm">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            <dt className="sr-only">When</dt>
            <dd className="font-semibold text-foreground">{when}</dd>
          </div>
          {where && (
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
              <dt className="sr-only">Where</dt>
              <dd className="text-muted-foreground">{where}</dd>
            </div>
          )}
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 size-4 shrink-0 text-accent-ink" aria-hidden />
            <dt className="sr-only">Party size</dt>
            <dd className="text-muted-foreground">
              {guests === 0 ? 'Just you' : `You plus ${guests} ${guests === 1 ? 'guest' : 'guests'}`}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
