import { jsonError, requirePrisma } from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { serveImage } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/members/[id]/avatar — a member's profile photograph.
 *
 * Signed-in members only, and only for somebody who is listed in the directory.
 * A church's faces are not something to publish at a guessable URL, and
 * unlisting yourself has to take the picture with it or the switch means very
 * little.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const viewer = await getApiUser()
  if (!viewer) return jsonError('Please sign in.', 401)

  try {
    const db = requirePrisma()
    const profile = await db.memberProfile.findUnique({
      where: { userId: params.id },
      select: { avatarKey: true, listed: true, user: { select: { bannedAt: true } } },
    })

    const visible = profile?.listed || params.id === viewer.id
    if (!profile?.avatarKey || !visible || profile.user.bannedAt) {
      return jsonError('We could not find that picture.', 404)
    }

    return await serveImage(profile.avatarKey)
  } catch {
    return jsonError('We could not find that picture.', 404)
  }
}
