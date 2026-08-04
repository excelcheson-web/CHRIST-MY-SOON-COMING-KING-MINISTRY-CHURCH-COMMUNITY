import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { ensureProfile } from '@/lib/profiles'
import { storage } from '@/lib/storage'
import { acceptImage } from '@/lib/uploads'
import { memberProfileSchema, snoozeSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/community/profile — my own profile, unredacted. */
export async function GET() {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  try {
    const profile = await ensureProfile(session.user.id)
    return jsonOk(profile)
  } catch (error) {
    return databaseError('profile GET', error)
  }
}

/**
 * PUT /api/community/profile — save my profile and privacy choices.
 *
 * Multipart when a new photograph came with it, JSON otherwise.
 */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  let body: unknown
  let photo: unknown = null
  let removePhoto = false

  const contentType = request.headers.get('content-type') ?? ''
  if (contentType.includes('multipart/form-data')) {
    let form: FormData
    try {
      form = await request.formData()
    } catch {
      return jsonError('We could not read that request.', 400)
    }

    photo = form.get('photo')
    removePhoto = form.get('removePhoto') === 'true'

    const text = (key: string) => {
      const value = form.get(key)
      return typeof value === 'string' ? value : undefined
    }
    const flag = (key: string) => form.get(key) === 'true'

    body = {
      headline: text('headline'),
      bio: text('bio'),
      neighbourhood: text('neighbourhood'),
      phone: text('phone'),
      address: text('address'),
      profession: text('profession'),
      spiritualGifts: text('spiritualGifts'),
      interests: text('interests'),
      skills: text('skills'),
      mentorAvailable: flag('mentorAvailable'),
      seekingMentor: flag('seekingMentor'),
      listed: flag('listed'),
      showEmail: flag('showEmail'),
      showPhone: flag('showPhone'),
      showBirthday: flag('showBirthday'),
      showNeighbourhood: flag('showNeighbourhood'),
      showAddress: flag('showAddress'),
      showProfession: flag('showProfession'),
    }
  } else {
    const read = await readJson(request)
    if (read.response) return read.response
    body = read.body
  }

  const parsed = memberProfileSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const upload = await acceptImage(photo, 'photo')
  if (!upload.ok) return upload.response

  try {
    const db = requirePrisma()

    const existing = await db.memberProfile.findUnique({
      where: { userId: session.user.id },
      select: { avatarKey: true },
    })

    // Only touch the photo when something actually happened to it, so saving
    // the rest of the form never quietly clears somebody's picture.
    const avatarKey = upload.image ? upload.image.key : removePhoto ? null : undefined

    const data = {
      ...parsed.data,
      ...(avatarKey !== undefined ? { avatarKey } : {}),
      lastActiveAt: new Date(),
    }

    const saved = await db.memberProfile.upsert({
      where: { userId: session.user.id },
      update: data,
      create: { ...data, userId: session.user.id },
      select: { id: true, listed: true, updatedAt: true },
    })

    // The old file goes only after the row points somewhere else — a failed
    // unlink must never leave a profile referencing bytes that are gone.
    if (existing?.avatarKey && avatarKey !== undefined && existing.avatarKey !== avatarKey) {
      await storage.remove(existing.avatarKey).catch(() => undefined)
    }

    revalidatePath('/community/directory')
    revalidatePath(`/community/members/${session.user.id}`)
    return jsonOk({ ...saved, updatedAt: saved.updatedAt.toISOString() })
  } catch (error) {
    return databaseError('profile PUT', error)
  }
}

/**
 * PATCH /api/community/profile — start or clear Do Not Disturb.
 *
 * Separate from the main save so a member can go quiet in one tap from
 * anywhere, without opening the whole profile form.
 */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = snoozeSchema.safeParse(body)
  if (!parsed.success) return jsonError('That is not a length of time we understand.', 422)

  try {
    const db = requirePrisma()
    const dndUntil =
      parsed.data.hours > 0 ? new Date(Date.now() + parsed.data.hours * 3_600_000) : null

    await db.memberProfile.upsert({
      where: { userId: session.user.id },
      update: { dndUntil },
      create: { userId: session.user.id, dndUntil },
    })

    return jsonOk({ dndUntil: dndUntil?.toISOString() ?? null })
  } catch (error) {
    return databaseError('profile snooze', error)
  }
}
