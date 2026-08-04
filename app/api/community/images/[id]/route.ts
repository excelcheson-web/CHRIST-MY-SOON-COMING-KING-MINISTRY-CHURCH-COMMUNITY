import { jsonError, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { canViewPost, loadCommunityViewer } from '@/lib/community'
import { storage } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/community/images/[id] — the picture attached to a post.
 *
 * Served through here rather than from `public/` because a small-group post's
 * photo is exactly as private as the post. The visibility check runs on every
 * request, so revoking access revokes the image with it — a public file URL
 * would stay readable to anyone who had ever seen it.
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const db = requirePrisma()
    const session = await auth()
    // The community section is members-only, so its API is too. Without this
    // the pages would be behind the door while the endpoints behind them
    // answered anybody who typed the URL.
    if (!session?.user) return jsonError('Please sign in to reach the community.', 401)
    const viewer = await loadCommunityViewer(session?.user)

    const post = await db.post.findUnique({
      where: { id: params.id },
      select: {
        imageKey: true,
        authorId: true,
        visibility: true,
        ministryId: true,
        smallGroupId: true,
        deletedAt: true,
      },
    })
    if (!post?.imageKey || !canViewPost(post, viewer)) {
      return jsonError('We could not find that picture.', 404)
    }

    const stream = await storage.stream(post.imageKey)
    const extension = post.imageKey.slice(post.imageKey.lastIndexOf('.')).toLowerCase()
    const mime =
      { '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }[
        extension
      ] ?? 'application/octet-stream'

    return new Response(stream, {
      headers: {
        'Content-Type': mime,
        // Private: the response depends on who asked, so a shared cache must
        // never hand one person's copy to the next.
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return jsonError('We could not find that picture.', 404)
  }
}
