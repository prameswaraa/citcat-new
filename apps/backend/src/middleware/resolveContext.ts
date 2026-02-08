/**
 * Context Resolution Middleware
 * 
 * Resolves the effective userId for data queries based on user role.
 * For Agents, this returns their Business Owner's ID.
 * For Business Owners, this returns their own ID.
 * 
 * This middleware enables agents to access their business owner's data
 * while maintaining proper audit tracking.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

import type { Context, Next } from 'hono'
import { teamService } from '../services/team-service.js'

/**
 * Extended context variables set by this middleware
 */
declare module 'hono' {
  interface ContextVariableMap {
    /**
     * The effective user ID for data queries.
     * For AGENT: their Business Owner's ID
     * For BUSINESS_OWNER/ADMIN: their own ID
     */
    effectiveUserId: string
    
    /**
     * The acting agent's ID for audit tracking.
     * Set when an AGENT is performing actions on behalf of a Business Owner.
     * Null for BUSINESS_OWNER and ADMIN users.
     */
    actingAgentId: string | null
  }
}

/**
 * Middleware to resolve the effective userId for data queries.
 * 
 * For Agents:
 * - Looks up their associated Business Owner via TeamMember
 * - Sets effectiveUserId to the Business Owner's ID
 * - Sets actingAgentId to the Agent's ID for audit tracking
 * 
 * For Business Owners and Admins:
 * - Sets effectiveUserId to their own ID
 * - Sets actingAgentId to null
 * 
 * Usage:
 * ```typescript
 * app.use('/api/messages/*', authMiddleware, resolveContext)
 * 
 * app.get('/api/messages', async (c) => {
 *   const userId = c.get('effectiveUserId') // Business Owner's ID for agents
 *   const agentId = c.get('actingAgentId')  // Agent's ID if acting as agent
 *   // ... query data using userId
 * })
 * ```
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
export async function resolveContext(c: Context, next: Next) {
  if (!c.user) {
    return c.json({
      error: {
        code: 'Unauthorized',
        message: 'Authentication required'
      }
    }, 401)
  }

  if (c.user.role === 'AGENT') {
    // For agents, use businessOwnerId from session context (set by auth middleware)
    // This avoids an extra database call since auth middleware already queries TeamMember
    // Requirements: 6.1
    const businessOwnerId = c.user.businessOwnerId ?? await teamService.getBusinessOwnerIdForAgent(c.user.id)
    
    if (!businessOwnerId) {
      return c.json({
        error: {
          code: 'Forbidden',
          message: 'Agent not associated with any business'
        }
      }, 403)
    }
    
    // Set effective user ID to business owner for data queries
    c.set('effectiveUserId', businessOwnerId)
    // Track the agent for audit purposes
    c.set('actingAgentId', c.user.id)
  } else {
    // For Business Owners and Admins, use their own ID
    c.set('effectiveUserId', c.user.id)
    c.set('actingAgentId', null)
  }

  await next()
}

/**
 * Helper function to get the effective user ID from context
 * Falls back to c.user.id if effectiveUserId is not set
 * 
 * @param c - Hono context
 * @returns The effective user ID for data queries
 */
export function getEffectiveUserId(c: Context): string {
  return c.get('effectiveUserId') || c.user?.id || ''
}

/**
 * Helper function to get the acting agent ID from context
 * 
 * @param c - Hono context
 * @returns The acting agent's ID or null
 */
export function getActingAgentId(c: Context): string | null {
  return c.get('actingAgentId') || null
}
