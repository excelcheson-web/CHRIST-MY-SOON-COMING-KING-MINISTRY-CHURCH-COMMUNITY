import { revalidatePath } from 'next/cache'

import {
  databaseError,
  jsonError,
  jsonOk,
  readJson,
  requirePrisma,
} from '@/lib/api-guards'
import { getApiUser } from '@/lib/auth'
import { canModeratePrayer } from '@/lib/permissions'
import { uniqueSlug } from '@/lib/slug'
import { prayerGroupSchema, prayerGroupUpdateSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function refresh() {
  revalidatePath('/prayer/groups')
  revalidatePath('/admin/prayer')
}

/** Only the prayer team, pastors and admins create or change groups. */
async function guard() {
  const user = await getApiUser()
  if (!user) return { user: null, response: jsonError('Please sign in.', 401) } as const
  if (!canModeratePrayer(user.role)) {
    return { user: null, response: jsonError('Only the prayer team can manage groups.', 403) } as const
  }
  return { user, response: null } as const
}

/** POST /api/prayer/groups — create a prayer group. */
export async function POST(request: Request) {
  const auth = await guard()
  if (auth.response) return auth.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = prayerGroupSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  try {
    const prisma = requirePrisma()
    const slug = await uniqueSlug(parsed.data.name, async (candidate) =>
      Boolean(await prisma.prayerGroup.findUnique({ where: { slug: candidate }, select: { id: true } })),
    )

    const group = await prisma.prayerGroup.create({
      data: { ...parsed.data, slug },
      select: { id: true, slug: true, name: true },
    })

    refresh()
    return jsonOk(group, 201)
  } catch (error) {
    return databaseError('prayer/groups POST', error)
  }
}

/** PATCH /api/prayer/groups — update a group (id in the body). */
export async function PATCH(request: Request) {
  const auth = await guard()
  if (auth.response) return auth.response

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = prayerGroupUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError('Please check the form.', 422, parsed.error.flatten().fieldErrors as Record<string, string[]>)
  }

  const { id, ...fields } = parsed.data

  try {
    const prisma = requirePrisma()
    const group = await prisma.prayerGroup.update({
      where: { id },
      data: Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
      select: { id: true, slug: true, name: true },
    })

    refresh()
    return jsonOk(group)
  } catch (error) {
    return databaseError('prayer/groups PATCH', error)
  }
}

/** DELETE /api/prayer/groups?id=… — removes the group, its board and memberships. */
export async function DELETE(request: Request) {
  const auth = await guard()
  if (auth.response) return auth.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return jsonError('A group id is required.', 422)

  try {
    const prisma = requirePrisma()
    await prisma.prayerGroup.delete({ where: { id } })
    refresh()
    return jsonOk({ id })
  } catch (error) {
    return databaseError('prayer/groups DELETE', error)
  }
}
