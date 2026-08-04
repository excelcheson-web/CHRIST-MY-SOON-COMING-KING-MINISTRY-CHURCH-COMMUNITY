import { databaseError, jsonError, jsonOk, requirePrisma } from '@/lib/api-guards'
import { auth } from '@/lib/auth'
import { directorySelect, directoryWhere, redactProfile, suggestPeople } from '@/lib/profiles'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/community/directory — find other members.
 *
 * Members only, with no guest path. A church directory listing who worships
 * where and when is exactly the thing that should not be crawlable.
 *
 * Every row goes through `redactProfile`, so a hidden phone number is hidden
 * here too — the API is not a way around the privacy switches.
 */
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return jsonError('Please sign in.', 401)

  const url = new URL(request.url)
  const take = Math.min(Number(url.searchParams.get('take') ?? 30) || 30, 60)

  try {
    const db = requirePrisma()

    if (url.searchParams.get('suggest') === '1') {
      return jsonOk(await suggestPeople(session.user.id))
    }

    const people = await db.user.findMany({
      where: directoryWhere({
        q: url.searchParams.get('q') ?? undefined,
        gift: url.searchParams.get('gift') ?? undefined,
        interest: url.searchParams.get('interest') ?? undefined,
        skill: url.searchParams.get('skill') ?? undefined,
        neighbourhood: url.searchParams.get('neighbourhood') ?? undefined,
        ministry: url.searchParams.get('ministry') ?? undefined,
        mentors: url.searchParams.get('mentors') === '1',
      }),
      select: directorySelect,
      orderBy: { name: 'asc' },
      take,
    })

    return jsonOk(people.map((person) => redactProfile(person, session.user.id)))
  } catch (error) {
    return databaseError('directory', error)
  }
}
