import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canViewPost, loadCommunityViewer } from '@/lib/community'
import { postReportSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/community/posts/[id]/report — flag a post for a leader to look at.
 *
 * The post is marked `flagged` immediately so it stands out in the moderation
 * queue, but it stays visible: hiding anything on a single unreviewed report
 * would hand every disagreement a mute button.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in to report something.', 401)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = postReportSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please tell us what is wrong.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const db = requirePrisma()
    const viewer = await loadCommunityViewer(session.user)

    const post = await db.post.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        authorId: true,
        visibility: true,
        ministryId: true,
        smallGroupId: true,
        deletedAt: true,
      },
    })
    if (!post || !canViewPost(post, viewer)) return jsonError('We could not find that post.', 404)

    await db.$transaction([
      db.postReport.create({
        data: { postId: post.id, reportedById: session.user.id, reason: parsed.data.reason },
      }),
      db.post.update({
        where: { id: post.id },
        data: { flagged: true, flagReason: parsed.data.reason.slice(0, 200) },
      }),
    ])

    revalidatePath('/admin/community')
    return jsonOk({ reported: true }, 201)
  } catch (error) {
    // Already reported by this person. Saying "thank you" is both true and
    // kinder than an error — the report is on file either way.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonOk({ reported: true })
    }
    return databaseError('community report', error)
  }
}
