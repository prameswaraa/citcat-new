import type { Context } from 'hono'
import { auth } from '../lib/auth.js'
import { prisma } from '../utils/database.js'
import type { Role } from '@prisma/client'
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache.js'

interface User {
  id: string
  email: string
  name: string
  role: Role
  twoFactorEnabled: boolean
  isActive: boolean
  /**
   * For AGENT users: the business owner's ID they belong to.
   * Null for BUSINESS_OWNER and ADMIN users.
   * Requirements: 6.1
   */
  businessOwnerId: string | null
}

declare module 'hono' {
  interface Context {
    user?: User
  }
}

export async function authMiddleware(c: Context, next: () => Promise<void>) {
  try {
    // Use Better Auth to get session
    const session = await auth.api.getSession({
      headers: c.req.raw.headers
    })

    if (!session?.user) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    // Try to get user from cache first (OPTIMIZATION)
    const cacheKey = CACHE_KEYS.user(session.user.id)
    let user = await getCache<User>(cacheKey)

    if (!user) {
      // Cache miss - get from database
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          twoFactorEnabled: true,
          isActive: true
        }
      })

      if (!dbUser || !dbUser.isActive) {
        return c.json({
          error: {
            code: 'Unauthorized',
            message: 'User not found or inactive'
          }
        }, 401)
      }

      // For AGENT users, get their businessOwnerId from TeamMember (Requirements: 6.1)
      let businessOwnerId: string | null = null
      if (dbUser.role === 'AGENT') {
        const teamMember = await prisma.teamMember.findFirst({
          where: {
            agentUserId: dbUser.id,
            status: 'ACTIVE'
          },
          select: { businessOwnerId: true }
        })
        businessOwnerId = teamMember?.businessOwnerId ?? null
      }

      // Store in cache for 5 minutes
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        twoFactorEnabled: dbUser.twoFactorEnabled,
        isActive: dbUser.isActive,
        businessOwnerId
      }

      await setCache(cacheKey, user, CACHE_TTL.USER)
    }

    if (!user.isActive) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'User not found or inactive'
        }
      }, 401)
    }

    // Set user in context
    c.user = user

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    return c.json({
      error: {
        code: 'Unauthorized',
        message: 'Authentication failed'
      }
    }, 401)
  }
}

// Role-based authorization middleware
export function requireRole(roles: Role[]) {
  return async (c: Context, next: () => Promise<void>) => {
    if (!c.user) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }
    
    if (!roles.includes(c.user.role)) {
      return c.json({
        error: {
          code: 'Forbidden',
          message: 'Insufficient permissions'
        }
      }, 403)
    }
    
    await next()
  }
}

// Note: requireBusinessAccess removed - no longer needed
// All WABA data is now directly on User model
