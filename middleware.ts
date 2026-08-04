import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

/**
 * Signed-out visitors never reach /dashboard or /admin; non-admins never reach
 * /admin. The server components behind these routes re-check with
 * `requireUser()` / `requireAdmin()` — middleware is the fast path, not the
 * only lock.
 */
export default withAuth(
  function middleware(request) {
    const { token } = request.nextauth

    /*
     * Coarse gate only — each admin page re-checks the specific permission it
     * needs and redirects with ?denied=…, so being on this list grants nothing
     * by itself.
     *
     * Must stay in step with `canAccessAdminArea` in lib/permissions.ts. It is
     * duplicated rather than imported because that module reads `Role` from
     * `@prisma/client` as a value, and the Prisma client cannot run in the edge
     * runtime middleware executes in.
     */
    const adminRoles = ['ADMIN', 'PASTOR', 'FOLLOW_UP_TEAM', 'PRAYER_TEAM', 'LEADER']

    if (request.nextUrl.pathname.startsWith('/admin') && !adminRoles.includes(token?.role ?? '')) {
      const url = new URL('/dashboard', request.url)
      url.searchParams.set('denied', 'admin')
      return NextResponse.redirect(url)
    }

    return NextResponse.next()
  },
  {
    pages: { signIn: '/login' },
    callbacks: { authorized: ({ token }) => Boolean(token) },
  },
)

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
