/**
 * Broadcast Eligible Customers Route
 * 
 * GET /api/v1/customers/broadcast-eligible
 * Returns customers eligible for broadcast (consented and not blacklisted)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'

const app = new Hono()

/**
 * GET /api/v1/customers/broadcast-eligible
 * List customers eligible for broadcast
 * 
 * Query params:
 * - search: string (optional) - Search by name or phone number
 * - tags: string (optional) - Comma-separated tags to filter by
 * - pipelineStageId: string (optional) - Filter by pipeline stage
 * - page: number (optional, default: 1) - Page number
 * - limit: number (optional, default: 50) - Items per page
 * 
 * Returns: Paginated list of eligible customers
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.5
 */
app.get('/broadcast-eligible', async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const userId = getEffectiveUserId(c)

    // Parse query params
    const search = c.req.query('search')
    const tagsParam = c.req.query('tags')
    const pipelineStageId = c.req.query('pipelineStageId')
    const whatsappPhoneNumberId = c.req.query('whatsappPhoneNumberId')
    const page = Math.max(1, parseInt(c.req.query('page') || '1', 10) || 1)
    const limit = Math.min(Math.max(1, parseInt(c.req.query('limit') || '50', 10) || 50), 100)

    // Build where clause - only consented and not blacklisted
    const where: any = {
      userId,
      consentStatus: true,
      blacklisted: false
    }

    // Filter by WhatsApp phone number (multi-number support)
    if (whatsappPhoneNumberId) {
      where.whatsappPhoneNumberId = whatsappPhoneNumberId
    }

    // Search filter
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Tags filter
    if (tagsParam) {
      const tags = tagsParam.split(',').map(t => t.trim()).filter(Boolean)
      if (tags.length > 0) {
        where.tags = { hasSome: tags }
      }
    }

    // Pipeline stage filter
    if (pipelineStageId) {
      where.pipelineStageId = pipelineStageId
    }

    // Get customers with pagination
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: {
          id: true,
          phoneNumber: true,
          name: true,
          tags: true,
          pipelineStage: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.customer.count({ where })
    ])

    return c.json({
      success: true,
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Get broadcast eligible customers error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch eligible customers' } }, 500)
  }
})

export default app
