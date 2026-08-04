import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canModerateCommunity, canPostToScope, loadCommunityViewer } from '@/lib/community'
import { pollSchema, pollVoteSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/community/polls — put a question to the church.
 *
 * Leaders only. A poll appears at the top of the feed and pulls a lot of
 * attention, which is a leadership decision rather than a member one.
 *
 * The poll is created together with a post so it flows through the ordinary
 * feed, inherits the visibility rules, and can be moderated like anything else.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)
  if (!canModerateCommunity(session.user.role)) {
    return jsonError('Only leaders can start a poll.', 403)
  }

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = pollSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const viewer = await loadCommunityViewer(session.user)

    const scope = await canPostToScope({ visibility: parsed.data.visibility }, viewer)
    if (!scope.ok) return jsonError(scope.error, scope.status)

    const post = await db.post.create({
      data: {
        authorId: session.user.id,
        type: 'QUESTION',
        channel: 'FEED',
        visibility: parsed.data.visibility,
        body: parsed.data.question,
        poll: {
          create: {
            question: parsed.data.question,
            multiple: parsed.data.multiple,
            closesAt: parsed.data.closesAt ?? null,
            createdById: session.user.id,
            options: {
              create: parsed.data.options.map((label, index) => ({ label, order: index })),
            },
          },
        },
      },
      select: { id: true },
    })

    revalidatePath('/community')
    return jsonOk({ postId: post.id }, 201)
  } catch (error) {
    return databaseError('poll POST', error)
  }
}

/** PUT /api/community/polls?id=… — cast or change a vote. */
export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to vote.', 401)
  const userId = session.user.id

  const pollId = new URL(request.url).searchParams.get('id')
  if (!pollId) return jsonError('Which poll?', 422)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = pollVoteSchema.safeParse(body)
  if (!parsed.success) return jsonError('Please choose an answer.', 422)

  try {
    const db = requirePrisma()

    const poll = await db.poll.findUnique({
      where: { id: pollId },
      select: {
        id: true,
        multiple: true,
        closesAt: true,
        options: { select: { id: true } },
      },
    })
    if (!poll) return jsonError('We could not find that poll.', 404)
    if (poll.closesAt && poll.closesAt < new Date()) {
      return jsonError('That poll has closed.', 409)
    }

    // Options must belong to this poll — otherwise a crafted request could vote
    // in a poll the member cannot even see.
    const valid = new Set(poll.options.map((option) => option.id))
    const chosen = parsed.data.optionIds.filter((id) => valid.has(id))
    if (chosen.length === 0) return jsonError('Please choose an answer.', 422)
    if (!poll.multiple && chosen.length > 1) {
      return jsonError('This poll only takes one answer.', 422)
    }

    /*
     * Replace rather than add. The unique index is on (option, user), which
     * cannot express "one row per poll" for single-answer polls — so changing
     * your mind is a delete-then-insert, in one transaction.
     */
    await db.$transaction([
      db.pollVote.deleteMany({ where: { pollId: poll.id, userId } }),
      db.pollVote.createMany({
        data: chosen.map((optionId) => ({ pollId: poll.id, optionId, userId })),
      }),
    ])

    const tally = await db.pollOption.findMany({
      where: { pollId: poll.id },
      orderBy: { order: 'asc' },
      select: { id: true, label: true, _count: { select: { votes: true } } },
    })

    revalidatePath('/community')
    return jsonOk({
      options: tally.map((option) => ({
        id: option.id,
        label: option.label,
        votes: option._count.votes,
        mine: chosen.includes(option.id),
      })),
    })
  } catch (error) {
    return databaseError('poll vote', error)
  }
}
