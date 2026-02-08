import type { Context } from 'hono'

/**
 * Admin authentication middleware
 * Verifies that the authenticated user has ADMIN role
 * Must be used after authMiddleware
 */
export async function adminAuthMiddleware(c: Context, next: () => Promise<void>) {
  // Check if user is authenticated (set by authMiddleware)
  if (!c.user) {
    return c.json({
      error: {
        code: 'Unauthorized',
        message: 'Authentication required'
      }
    }, 401)
  }

  // Check if user has ADMIN role
  if (c.user.role !== 'ADMIN') {
    return c.json({
      error: {
        code: 'Forbidden',
        message: 'Admin access required'
      }
    }, 403)
  }

  await next()
}
