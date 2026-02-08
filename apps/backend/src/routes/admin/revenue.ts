import { Hono } from 'hono'
import type { Context } from 'hono'
import { AdminRevenueService } from '../../services/admin/revenue-service.js'
import type { PaymentStatus } from '@prisma/client'

const app = new Hono()

// Valid payment status values
const VALID_STATUSES: PaymentStatus[] = ['PENDING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED']

/**
 * GET /api/v1/admin/revenue/stats
 * Get revenue statistics (total, monthly, transaction counts)
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
app.get('/stats', async (c: Context) => {
  try {
    const stats = await AdminRevenueService.getRevenueStats()

    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Admin get revenue stats error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch revenue statistics'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/admin/revenue/chart
 * Get monthly revenue data for chart visualization
 * Requirements: 2.1
 */
app.get('/chart', async (c: Context) => {
  try {
    const query = c.req.query()
    const months = Math.min(24, Math.max(1, parseInt(query.months || '12', 10) || 12))

    const chartData = await AdminRevenueService.getMonthlyRevenue(months)

    return c.json({
      success: true,
      data: chartData
    })
  } catch (error) {
    console.error('Admin get revenue chart error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch revenue chart data'
      }
    }, 500)
  }
})


/**
 * GET /api/v1/admin/revenue/by-tier
 * Get revenue breakdown by subscription tier (LITE vs PRO)
 * Requirements: 6.1, 6.2
 */
app.get('/by-tier', async (c: Context) => {
  try {
    const tierData = await AdminRevenueService.getRevenueByTier()

    return c.json({
      success: true,
      data: tierData
    })
  } catch (error) {
    console.error('Admin get revenue by tier error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch revenue by tier'
      }
    }, 500)
  }
})

/**
 * GET /api/v1/admin/revenue/transactions
 * Get paginated list of transactions with filtering and search
 * Requirements: 3.1, 4.1, 4.2, 4.3, 5.1
 */
app.get('/transactions', async (c: Context) => {
  try {
    const query = c.req.query()

    // Parse and validate query parameters
    const page = Math.max(1, parseInt(query.page || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10) || 20))
    const search = query.search || undefined

    // Validate status filter
    let status: PaymentStatus | undefined
    if (query.status) {
      if (!VALID_STATUSES.includes(query.status as PaymentStatus)) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: `Invalid status value. Must be one of: ${VALID_STATUSES.join(', ')}`
          }
        }, 400)
      }
      status = query.status as PaymentStatus
    }

    // Validate date filters
    let startDate: string | undefined
    let endDate: string | undefined

    if (query.startDate) {
      const date = new Date(query.startDate)
      if (isNaN(date.getTime())) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: 'Invalid date format for startDate'
          }
        }, 400)
      }
      startDate = query.startDate
    }

    if (query.endDate) {
      const date = new Date(query.endDate)
      if (isNaN(date.getTime())) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: 'Invalid date format for endDate'
          }
        }, 400)
      }
      endDate = query.endDate
    }

    const result = await AdminRevenueService.getTransactions({
      status,
      startDate,
      endDate,
      search,
      page,
      limit
    })

    return c.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Admin get transactions error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch transactions'
      }
    }, 500)
  }
})

export default app
