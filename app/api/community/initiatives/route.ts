import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { initiativeCardSelect, toInitiativeCard } from '@/lib/initiatives'
import { canManageContent } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { uniqueSlug } from '@/lib/slug'
import { initiativeSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** GET /api/community/initiatives — reading plans, fasts and challenges. Public. */
export async function GET(request: Request) {
  // Members only — reading plans, fasts and challenges are things this church
  // is doing together, not a public brochure.
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to reach the community.', 401)

  if (!prisma) return jsonOk([])

  const url = new URL(request.url)
  const kind = url.searchParams.get('kind')

  try {
    const records = await prisma.initiative.findMany({
      where: {
        isActive: true,
        ...(kind && kind !== 'all' ? { kind: kind as never } : {}),
      },
      select: initiativeCardSelect,
      orderBy: [{ isFeatured: 'desc' }, { startsOn: 'desc' }],
      take: 40,
    })
    return jsonOk(records.map(toInitiativeCard))
  } catch (error) {
    return databaseError('initiatives GET', error)
  }
}

/** POST /api/community/initiatives — start one. Pastors and administrators. */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canManageContent(session.user.role)) {
    return jsonError('Only pastors and administrators can start these.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = initiativeSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const { days, ...rest } = parsed.data

    const slug = await uniqueSlug(parsed.data.title, async (candidate) =>
      Boolean(await db.initiative.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const created = await db.initiative.create({
      data: {
        ...rest,
        slug,
        createdById: session.user.id,
        // One line per day, in order. A fast or challenge with no lines is
        // perfectly valid — it just tracks days without readings.
        days: {
          create: days.map((reference, index) => ({ dayNumber: index + 1, reference })),
        },
      },
      select: { id: true, slug: true, title: true, kind: true },
    })

    revalidatePath('/community/growing')
    revalidatePath('/admin/initiatives')
    return jsonOk(created, 201)
  } catch (error) {
    return databaseError('initiatives POST', error)
  }
}
