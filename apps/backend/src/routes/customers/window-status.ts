import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { checkWindowStatus, formatRemainingTime } from '../../utils/messageWindow.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'

const app = new Hono()

// GET /api/v1/customers/:id/window-status - Get 24-hour window status
app.get('/:id/window-status', async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const id = c.req.param('id')

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!customer) {
      return c.json({ error: { code: 'NotFound', message: 'Customer not found' } }, 404)
    }

    // Use effectiveUserId for agents to access business owner's customers
    const effectiveUserId = getEffectiveUserId(c)

    // Check access - allow if admin or if customer belongs to effective user
    if (c.user.role !== 'ADMIN' && effectiveUserId !== customer.userId) {
      return c.json({ error: { code: 'Forbidden', message: 'Access denied' } }, 403)
    }

    const windowStatus = await checkWindowStatus(id)

    return c.json({
      success: true,
      data: {
        customerId: id,
        isActive: windowStatus.isActive,
        lastInboundMessageAt: windowStatus.lastInboundMessageAt,
        windowExpiresAt: windowStatus.windowExpiresAt,
        remainingTime: windowStatus.remainingTime,
        remainingTimeFormatted: formatRemainingTime(windowStatus.remainingTime),
        status: windowStatus.status
      }
    })
  } catch (error) {
    console.error('Get window status error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to get window status' } }, 500)
  }
})

export default app
