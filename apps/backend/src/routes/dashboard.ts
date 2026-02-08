import { Hono } from 'hono'
import type { Context } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { getCache, setCache, CACHE_KEYS, CACHE_TTL } from '../utils/cache.js'
import { DashboardStatsService } from '../services/dashboard-stats-service.js'

const app = new Hono()

// GET /api/v1/dashboard/stats - Get enhanced dashboard statistics
// Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4
app.get('/stats', requireRole(['ADMIN', 'BUSINESS_OWNER', 'AGENT']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const userId = c.req.query('userId') || c.user.id

    if (c.user.role !== 'ADMIN' && c.user.id !== userId) {
      return c.json({ error: { code: 'Forbidden', message: 'Access denied' } }, 403)
    }

    // Get optional phone number filter for multi-number support
    const whatsappPhoneNumberId = c.req.query('whatsappPhoneNumberId') || undefined

    // Try to get from cache first (include phone number in cache key)
    const cacheKey = `${CACHE_KEYS.dashboardStats(userId as string)}${whatsappPhoneNumberId ? `:${whatsappPhoneNumberId}` : ''}`
    const cachedStats = await getCache(cacheKey)

    if (cachedStats) {
      return c.json({ success: true, data: cachedStats, cached: true })
    }

    // Get enhanced stats from service (with optional phone number filter)
    const stats = await DashboardStatsService.getEnhancedStats(userId as string, whatsappPhoneNumberId)

    // Cache the result for 60 seconds
    await setCache(cacheKey, stats, CACHE_TTL.DASHBOARD_STATS)

    return c.json({ success: true, data: stats, cached: false })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch dashboard stats' } }, 500)
  }
})

// GET /api/v1/dashboard/message-volume - Get message volume for chart
// Requirements: 1.4, 3.1
app.get('/message-volume', requireRole(['ADMIN', 'BUSINESS_OWNER', 'AGENT']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const userId = c.req.query('userId') || c.user.id
    const days = parseInt(c.req.query('days') || '30', 10)
    const whatsappPhoneNumberId = c.req.query('whatsappPhoneNumberId') || undefined

    if (c.user.role !== 'ADMIN' && c.user.id !== userId) {
      return c.json({ error: { code: 'Forbidden', message: 'Access denied' } }, 403)
    }

    // Validate days parameter (1-90 days)
    const validDays = Math.min(Math.max(days, 1), 90)

    // Try to get from cache first (include phone number in cache key)
    const cacheKey = `dashboard:message-volume:${userId}:${validDays}${whatsappPhoneNumberId ? `:${whatsappPhoneNumberId}` : ''}`
    const cachedData = await getCache(cacheKey)

    if (cachedData) {
      return c.json({ success: true, data: cachedData, cached: true })
    }

    const volumeData = await DashboardStatsService.getMessageVolume(userId as string, validDays, whatsappPhoneNumberId)

    // Cache for 5 minutes
    await setCache(cacheKey, volumeData, 300)

    return c.json({ success: true, data: volumeData, cached: false })
  } catch (error) {
    console.error('Message volume error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch message volume' } }, 500)
  }
})

// GET /api/v1/dashboard/customer-insights - Get customer insights
// Requirements: 2.4, 2.5, 2.6
app.get('/customer-insights', requireRole(['ADMIN', 'BUSINESS_OWNER', 'AGENT']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const userId = c.req.query('userId') || c.user.id
    const whatsappPhoneNumberId = c.req.query('whatsappPhoneNumberId') || undefined

    if (c.user.role !== 'ADMIN' && c.user.id !== userId) {
      return c.json({ error: { code: 'Forbidden', message: 'Access denied' } }, 403)
    }

    // Try to get from cache first (include phone number in cache key)
    const cacheKey = `dashboard:customer-insights:${userId}${whatsappPhoneNumberId ? `:${whatsappPhoneNumberId}` : ''}`
    const cachedData = await getCache(cacheKey)

    if (cachedData) {
      return c.json({ success: true, data: cachedData, cached: true })
    }

    const insights = await DashboardStatsService.getCustomerInsights(userId as string, whatsappPhoneNumberId)

    // Cache for 2 minutes
    await setCache(cacheKey, insights, 120)

    return c.json({ success: true, data: insights, cached: false })
  } catch (error) {
    console.error('Customer insights error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch customer insights' } }, 500)
  }
})

// GET /api/v1/dashboard/quality-metrics - Get quality metrics
// Requirements: 5.1, 5.2, 5.3, 5.4
app.get('/quality-metrics', requireRole(['ADMIN', 'BUSINESS_OWNER', 'AGENT']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const userId = c.req.query('userId') || c.user.id
    const whatsappPhoneNumberId = c.req.query('whatsappPhoneNumberId') || undefined

    if (c.user.role !== 'ADMIN' && c.user.id !== userId) {
      return c.json({ error: { code: 'Forbidden', message: 'Access denied' } }, 403)
    }

    // Try to get from cache first (include phone number in cache key)
    const cacheKey = `dashboard:quality-metrics:${userId}${whatsappPhoneNumberId ? `:${whatsappPhoneNumberId}` : ''}`
    const cachedData = await getCache(cacheKey)

    if (cachedData) {
      return c.json({ success: true, data: cachedData, cached: true })
    }

    const metrics = await DashboardStatsService.getQualityMetrics(userId as string, whatsappPhoneNumberId)

    // Cache for 5 minutes
    await setCache(cacheKey, metrics, 300)

    return c.json({ success: true, data: metrics, cached: false })
  } catch (error) {
    console.error('Quality metrics error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch quality metrics' } }, 500)
  }
})

export default app
