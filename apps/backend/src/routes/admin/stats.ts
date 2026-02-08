import { Hono } from 'hono'
import type { Context } from 'hono'
import { AdminStatsService } from '../../services/admin/stats-service.js'

const app = new Hono()

/**
 * GET /api/v1/admin/stats
 * Get admin dashboard statistics
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
 */
app.get('/', async (c: Context) => {
  try {
    const stats = await AdminStatsService.getAllStats()

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch admin statistics'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/admin/stats/users
 * Get user statistics only
 */
app.get('/users', async (c: Context) => {
  try {
    const stats = await AdminStatsService.getUserStats()

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Admin user stats error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch user statistics'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/admin/stats/messages
 * Get message statistics only
 */
app.get('/messages', async (c: Context) => {
  try {
    const stats = await AdminStatsService.getMessageStats()

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Admin message stats error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch message statistics'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/admin/stats/connections
 * Get connection statistics only
 */
app.get('/connections', async (c: Context) => {
  try {
    const stats = await AdminStatsService.getConnectionStats()

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Admin connection stats error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch connection statistics'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/admin/stats/message-volume
 * Get message volume per day for chart
 * Query params: days (default 30)
 */
app.get('/message-volume', async (c: Context) => {
  try {
    const daysParam = c.req.query('days')
    const days = daysParam ? Math.min(90, Math.max(7, parseInt(daysParam, 10) || 30)) : 30
    
    const data = await AdminStatsService.getMessageVolume(days)

    return c.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Admin message volume error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch message volume'
      }
    }, 500)
  }
})

export default app
