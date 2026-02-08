import { Hono } from 'hono'
import { wabaMetrics, webhookMonitor } from '../services/monitoring/index.js'

const monitoring = new Hono()

/**
 * GET /api/v1/monitoring/health
 * Get overall system health status
 */
monitoring.get('/health', async (c) => {
  try {
    const metrics = await wabaMetrics.getSystemMetrics()
    
    return c.json({
      success: true,
      data: {
        status: 'healthy',
        ...metrics
      }
    })
  } catch (error) {
    console.error('Failed to get system health:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve system health'
    }, 500)
  }
})

/**
 * GET /api/v1/monitoring/metrics
 * Get system metrics
 */
monitoring.get('/metrics', async (c) => {
  try {
    const metrics = await wabaMetrics.getSystemMetrics()
    
    return c.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Failed to get metrics:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve metrics'
    }, 500)
  }
})

/**
 * GET /api/v1/monitoring/user/:userId
 * Get metrics for a specific user
 */
monitoring.get('/user/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const metrics = await wabaMetrics.getUserMetrics(userId)
    
    return c.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Failed to get user metrics:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve user metrics'
    }, 500)
  }
})

/**
 * GET /api/v1/monitoring/webhook/:userId
 * Get webhook metrics for a user
 */
monitoring.get('/webhook/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const startDate = c.req.query('startDate')
    const endDate = c.req.query('endDate')

    const start = startDate ? new Date(startDate) : undefined
    const end = endDate ? new Date(endDate) : undefined

    const metrics = await webhookMonitor.getMetrics(userId, start, end)
    
    return c.json({
      success: true,
      data: metrics
    })
  } catch (error) {
    console.error('Failed to get webhook metrics:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve webhook metrics'
    }, 500)
  }
})

/**
 * GET /api/v1/monitoring/webhook-health/:userId
 * Get webhook health status for a user
 */
monitoring.get('/webhook-health/:userId', async (c) => {
  try {
    const userId = c.req.param('userId')
    const health = await webhookMonitor.getHealth(userId)
    
    return c.json({
      success: true,
      data: health
    })
  } catch (error) {
    console.error('Failed to get webhook health:', error)
    return c.json({
      success: false,
      error: 'Failed to retrieve webhook health'
    }, 500)
  }
})

export default monitoring
