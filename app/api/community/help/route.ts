import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { helpBoardWhere } from '@/lib/initiatives'
import { touchActivity } from '@/lib/profiles'
import { clientIp, rateLimit, sweepRateLimits } from '@/lib/rate-limit'
import { helpPostSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/community/help — the help board.
 *
 * Members only, with no guest path at all. "I am away next week, can someone
 * feed the cat" is not something to publish to the open internet.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const url = new URL(request.url)
  const take = Math.min(Number(url.searchParams.get('take') ?? 30) || 30, 60)

  try {
    const db = requirePrisma()
    const posts = await db.helpPost.findMany({
      where: helpBoardWhere({
        kind: (url.searchParams.get('kind') as never) ?? undefined,
        category: (url.searchParams.get('category') as never) ?? undefined,
        area: url.searchParams.get('area') ?? undefined,
        mine: url.searchParams.get('mine') === '1' ? session.user.id : undefined,
        includeClosed: url.searchParams.get('closed') === '1',
      }),
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take,
      select: {
        id: true,
        kind: true,
        category: true,
        title: true,
        body: true,
        timeframe: true,
        area: true,
        status: true,
        createdAt: true,
        authorId: true,
        author: { select: { name: true, image: true } },
        claimedBy: { select: { id: true, name: true } },
        _count: { select: { replies: true } },
      },
    })

    return jsonOk(
      posts.map((post) => ({
        ...post,
        createdAt: post.createdAt.toISOString(),
        replyCount: post._count.replies,
        isMine: post.authorId === session.user.id,
      })),
    )
  } catch (error) {
    return databaseError('help GET', error)
  }
}

/** POST /api/community/help — ask for a hand, or offer one. */
export async function POST(request: Request) {
  sweepRateLimits()

  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const limit = rateLimit(`help:${session.user.id}:${clientIp(request.headers)}`, 10, 60 * 60 * 1000)
  if (!limit.ok) return jsonError('That is a lot of posts at once. Please try again shortly.', 429)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = helpPostSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()

    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { bannedAt: true, chatBannedAt: true },
    })
    if (me?.bannedAt || me?.chatBannedAt) {
      return jsonError('You cannot post in the community at the moment.', 403)
    }

    const created = await db.helpPost.create({
      data: { ...parsed.data, authorId: session.user.id },
      select: { id: true, kind: true, title: true },
    })

    await touchActivity(session.user.id)
    revalidatePath('/community/help')
    return jsonOk(created, 201)
  } catch (error) {
    return databaseError('help POST', error)
  }
}
