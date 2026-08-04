import { jsonError, requirePrisma } from '@/lib/api-guards'
import { serveImage } from '@/lib/uploads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/calendar/[id]/image — artwork for a church-calendar date.
 *
 * Public, and cached as such: Christmas is not a secret, the picture sits on
 * the public home page, and a shared cache is exactly what you want for it.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const db = requirePrisma()
    const entry = await db.calendarDate.findUnique({
      where: { id: params.id },
      select: { imageKey: true, isActive: true },
    })

    if (!entry?.imageKey || !entry.isActive) {
      return jsonError('We could not find that picture.', 404)
    }

    return await serveImage(entry.imageKey, true)
  } catch {
    return jsonError('We could not find that picture.', 404)
  }
}
