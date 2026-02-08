/**
 * Permission Middleware
 * 
 * Implements role-based access control for the Team Agent Management feature.
 * Defines permissions for AGENT and BUSINESS_OWNER roles.
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */

import type { Context, Next } from 'hono'
import type { Role } from '@prisma/client'

/**
 * Permission types for the application
 */
export type Permission =
  | 'messages:read'
  | 'messages:write'
  | 'customers:read'
  | 'customers:write'
  | 'customers:delete'
  | 'templates:manage'
  | 'channels:manage'
  | 'settings:manage'
  | 'billing:manage'
  | 'team:manage'
  | 'ai:manage'
  | 'developers:manage'

/**
 * Role-based permission mapping
 * 
 * AGENT role: Limited to customer support tasks
 * - messages:read, messages:write - Can view and send messages
 * - customers:read, customers:write - Can view and update customer info
 * - Note: No customers:delete, no manage permissions
 * 
 * BUSINESS_OWNER role: Full access to all features
 * 
 * ADMIN role: Full access (wildcard)
 * 
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[] | ['*']> = {
  ADMIN: ['*'], // All permissions
  BUSINESS_OWNER: [
    'messages:read',
    'messages:write',
    'customers:read',
    'customers:write',
    'customers:delete',
    'templates:manage',
    'channels:manage',
    'settings:manage',
    'billing:manage',
    'team:manage',
    'ai:manage',
    'developers:manage'
  ],
  AGENT: [
    'messages:read',
    'messages:write',
    'customers:read',
    'customers:write'
    // Note: No customers:delete, no manage permissions
  ]
}

/**
 * Check if a role has a specific permission
 * 
 * @param role - The user's role
 * @param permission - The permission to check
 * @returns True if the role has the permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  
  // Wildcard means all permissions
  if (permissions[0] === '*') {
    return true
  }
  
  return (permissions as Permission[]).includes(permission)
}

/**
 * Middleware to check if user has required permission
 * 
 * Usage:
 * ```typescript
 * app.get('/team', requirePermission('team:manage'), async (c) => { ... })
 * ```
 * 
 * @param permission - The required permission
 * @returns Hono middleware function
 * 
 * Requirements: 5.1, 5.2
 */
export function requirePermission(permission: Permission) {
  return async (c: Context, next: Next) => {
    if (!c.user) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    if (!hasPermission(c.user.role, permission)) {
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

/**
 * Middleware to check if user has any of the required permissions
 * 
 * Usage:
 * ```typescript
 * app.get('/data', requireAnyPermission(['messages:read', 'customers:read']), async (c) => { ... })
 * ```
 * 
 * @param permissions - Array of permissions (user needs at least one)
 * @returns Hono middleware function
 */
export function requireAnyPermission(permissions: Permission[]) {
  return async (c: Context, next: Next) => {
    if (!c.user) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    const hasAny = permissions.some(p => hasPermission(c.user!.role, p))
    
    if (!hasAny) {
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
