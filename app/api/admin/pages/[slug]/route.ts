import { revalidatePath } from 'next/cache'

import { databaseError, jsonError, jsonOk, readJson, requireContentApi, requirePrisma } from '@/lib/api-guards'
import { staticPagesBySlug, type StaticPage } from '@/content/pages'
import { pageContentSchema } from '@/lib/validations'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EDITABLE: StaticPage['slug'][] = ['about', 'founder', 'doctrine']

function isEditable(slug: string): slug is StaticPage['slug'] {
  return (EDITABLE as string[]).includes(slug)
}

/**
 * PATCH /api/admin/pages/[slug] — save About, Founder or Doctrine.
 *
 * Upserts, because these pages may still be served from the bundled file: the
 * first save is what creates the database row that then takes precedence.
 */
export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response

  if (!isEditable(params.slug)) return jsonError('That page cannot be edited here.', 404)

  const { body, response } = await readJson(request)
  if (response) return response

  const parsed = pageContentSchema.safeParse(body)
  if (!parsed.success) {
    return jsonError(
      'Please check the form.',
      422,
      parsed.error.flatten().fieldErrors as Record<string, string[]>,
    )
  }

  try {
    const prisma = requirePrisma()
    const bundled = staticPagesBySlug[params.slug]

    const page = await prisma.pageContent.upsert({
      where: { slug: params.slug },
      update: {
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        content: parsed.data.content,
        published: parsed.data.published,
      },
      create: {
        slug: params.slug,
        title: parsed.data.title,
        subtitle: parsed.data.subtitle,
        content: parsed.data.content,
        published: parsed.data.published,
        // Keep the hero emoji and highlights the bundled copy came with.
        meta: (bundled.meta ?? {}) as object,
      },
      select: { slug: true, title: true, updatedAt: true },
    })

    revalidatePath(`/${params.slug}`)
    revalidatePath('/admin/pages')

    return jsonOk({ ...page, updatedAt: page.updatedAt.toISOString() })
  } catch (error) {
    return databaseError('admin pages PATCH', error)
  }
}

/**
 * DELETE — revert to the wording shipped in `content/pages.ts`.
 *
 * Removing the row rather than blanking it means the bundled copy takes over
 * again, so this is a genuine undo rather than an empty page.
 */
export async function DELETE(_request: Request, { params }: { params: { slug: string } }) {
  const guard = await requireContentApi()
  if (guard.response) return guard.response
  if (!isEditable(params.slug)) return jsonError('That page cannot be edited here.', 404)

  try {
    const prisma = requirePrisma()
    await prisma.pageContent.delete({ where: { slug: params.slug } }).catch(() => null)

    revalidatePath(`/${params.slug}`)
    revalidatePath('/admin/pages')

    return jsonOk({ slug: params.slug, reverted: true })
  } catch (error) {
    return databaseError('admin pages DELETE', error)
  }
}
