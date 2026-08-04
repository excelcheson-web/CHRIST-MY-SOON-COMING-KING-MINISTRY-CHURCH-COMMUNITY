import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canReadCare } from '@/lib/initiatives'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { careRequestSchema, careReviewSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/community/care — the pastoral queue. Pastors and admins only.
 *
 * Deliberately narrower than community moderation. A small-group leader
 * moderates posts; they do not get to read who in their group asked for help
 * with rent.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canReadCare(session.user.role)) {
    return jsonError('Only pastors and administrators can read these.', 403)
  }

  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  try {
    const db = requirePrisma()
    const requests = await db.careRequest.findMany({
      where: status && status !== 'all' ? { status: status as never } : {},
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      include: {
        author: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    })

    return jsonOk(
      requests.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        respondedAt: row.respondedAt?.toISOString() ?? null,
      })),
    )
  } catch (error) {
    return databaseError('care GET', error)
  }
}

/**
 * POST /api/community/care — ask an elder, or ask for practical help.
 *
 * Anonymous submissions store **no author id at all** rather than hiding one at
 * render time: there is then nothing for a future query to leak. The optional
 * reply address is the only thread back, and the person chooses whether to
 * leave it.
 */
export async function POST(request: Request) {
  sweepRateLimits()

  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const limit = rateLimit(`care:${session.user.id}:${clientIp(request.headers)}`, 6, 60 * 60 * 1000)
  if (!limit.ok) {
    return jsonError('We have your messages — please give us a little time to reply.', 429)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = careRequestSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  const { anonymous, replyToEmail, ...rest } = parsed.data

  try {
    const db = requirePrisma()

    const created = await db.careRequest.create({
      data: {
        ...rest,
        authorId: anonymous ? null : session.user.id,
        // Anonymous: only what they typed. Named: fall back to their account
        // address so a pastor always has a way to answer.
        replyToEmail: anonymous ? (replyToEmail ?? null) : (replyToEmail ?? session.user.email),
      },
      select: { id: true, kind: true, createdAt: true },
    })

    revalidatePath('/admin/care')
    return jsonOk({ ...created, createdAt: created.createdAt.toISOString() }, 201)
  } catch (error) {
    return databaseError('care POST', error)
  }
}

/** PATCH /api/community/care?id=… — a pastor answers. */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canReadCare(session.user.role)) {
    return jsonError('Only pastors and administrators can do that.', 403)
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return jsonError('Which request?', 422)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = careReviewSchema.safeParse(body)
  if (!parsed.success) return jsonError('Please check the form.', 422)

  try {
    const db = requirePrisma()
    const updated = await db.careRequest.update({
      where: { id },
      data: {
        status: parsed.data.status,
        response: parsed.data.response ?? null,
        assignedToId: parsed.data.assignedToId || null,
        ...(parsed.data.response ? { respondedAt: new Date() } : {}),
      },
      select: { id: true, status: true },
    })

    revalidatePath('/admin/care')
    return jsonOk(updated)
  } catch (error) {
    return databaseError('care PATCH', error)
  }
}
