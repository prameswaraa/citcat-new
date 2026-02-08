import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'

const app = new Hono()

// GET /api/v1/customers/stats - Get customer statistics
app.get('/stats', async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    // Use effectiveUserId for agents to access business owner's customers
    const userId = getEffectiveUserId(c)

    // Get all stats in parallel for performance
    const [total, consented, activeWindow, blacklisted] = await Promise.all([
      // Total customers
      prisma.customer.count({
        where: { userId }
      }),
      // Consented customers
      prisma.customer.count({
        where: { userId, consentStatus: true }
      }),
      // Active messaging window (24h)
      prisma.customer.count({
        where: { userId, isWindowActive: true }
      }),
      // Blacklisted customers
      prisma.customer.count({
        where: { userId, blacklisted: true }
      }),
    ])

    return c.json({
      success: true,
      data: {
        total,
        consented,
        activeWindow,
        blacklisted,
      }
    })
  } catch (error) {
    console.error('Get customer stats error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch customer stats' } }, 500)
  }
})

export default app
