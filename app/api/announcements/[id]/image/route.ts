import { jsonError, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { announcementWhere } from '@/lib/home-content'
import { serveImage } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/announcements/[id]/image — the design attached to an announcement.
 *
 * The picture is exactly as private as the announcement, so the same audience
 * filter runs here. A departmental flyer with a home address or a rota on it
 * should not be readable by anybody who guesses the id.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const db = requirePrisma()
    const session = await auth()

    const ministryIds = session?.user?.id
      ? (
          await db.ministryMember.findMany({
            where: { userId: session.user.id },
            select: { ministryId: true },
          })
        ).map((row) => row.ministryId)
      : []

    const isLeader =
      session?.user?.role === 'ADMIN' ||
      session?.user?.role === 'PASTOR' ||
      session?.user?.role === 'LEADER'

    const announcement = await db.announcement.findFirst({
      where: {
        AND: [
          { id: params.id },
          announcementWhere({ id: session?.user?.id, ministryIds, isLeader }),
        ],
      },
      select: { imageKey: true, audience: true },
    })

    if (!announcement?.imageKey) return jsonError('We could not find that picture.', 404)

    return await serveImage(announcement.imageKey, announcement.audience === 'PUBLIC')
  } catch {
    return jsonError('We could not find that picture.', 404)
  }
}
