import { CheckInMethod, RegistrationStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canManageEvents } from '@/lib/permissions'
import { checkInSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export type CheckInResult = {
  name: string
  guests: number
  seats: number
  status: RegistrationStatus
  accessibilityNeeds: string | null
  dietaryNotes: string | null
  /** True when this booking had already been scanned. */
  alreadyCheckedIn: boolean
  checkedInAt: string
}

/**
 * POST /api/events/[slug]/check-in
 *
 * Accepts either the long QR token or the short desk code — a volunteer on an
 * iPhone (no BarcodeDetector) must be able to type six characters and get the
 * same result as a scan.
 *
 * Re-scanning is not an error. It answers "already checked in, at 09:14" so the
 * person on the door knows to wave them through rather than argue.
 */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const user = await getApiUser()
  if (!user) return jsonError('Please sign in.', 401)
  if (!canManageEvents(user.role)) return jsonError('Only event stewards can check people in.', 403)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = checkInSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please scan a code or type the six-character one.', 422)
  }

  // A scanned QR arrives as a full URL; keep only the token on the end.
  const raw = parsed.data.value.trim()
  const token = raw.includes('/') ? (raw.split('/').filter(Boolean).pop() ?? raw) : raw
  const code = raw.toUpperCase()

  try {
    const db = requirePrisma()

    const event = await db.event.findUnique({
      where: { slug: params.slug },
      select: { id: true, title: true },
    })
    if (!event) return jsonError('Event not found.', 404)

    const registration = await db.eventRegistration.findFirst({
      where: {
        eventId: event.id,
        OR: [{ token }, { code }],
      },
      select: {
        id: true,
        name: true,
        guests: true,
        status: true,
        checkedInAt: true,
        accessibilityNeeds: true,
        dietaryNotes: true,
      },
    })

    if (!registration) {
      return jsonError('No booking found for that code at this event.', 404)
    }

    if (registration.status === RegistrationStatus.CANCELLED) {
      return jsonError(`${registration.name} cancelled this booking.`, 409)
    }

    if (registration.checkedInAt) {
      return jsonOk<CheckInResult>({
        name: registration.name,
        guests: registration.guests,
        seats: registration.guests + 1,
        status: registration.status,
        accessibilityNeeds: registration.accessibilityNeeds,
        dietaryNotes: registration.dietaryNotes,
        alreadyCheckedIn: true,
        checkedInAt: registration.checkedInAt.toISOString(),
      })
    }

    const now = new Date()
    await db.eventRegistration.update({
      where: { id: registration.id },
      data: {
        checkedInAt: now,
        checkInMethod: parsed.data.method as CheckInMethod,
        checkedInById: user.id,
      },
    })

    revalidatePath(`/admin/events/${params.slug}`)

    return jsonOk<CheckInResult>({
      name: registration.name,
      guests: registration.guests,
      seats: registration.guests + 1,
      status: registration.status,
      accessibilityNeeds: registration.accessibilityNeeds,
      dietaryNotes: registration.dietaryNotes,
      alreadyCheckedIn: false,
      checkedInAt: now.toISOString(),
    })
  } catch (error) {
    return databaseError('events check-in', error)
  }
}
