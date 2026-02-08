import { Hono } from 'hono'
import type { Context } from 'hono'
import { requireRole } from '../middleware/auth.js'
import { prisma } from '../utils/database.js'

const app = new Hono()

// GET /api/v1/analytics - Get analytics data
app.get('/', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const userId = c.user.id
    const timeRange = c.req.query('timeRange') || '7d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()

    switch (timeRange) {
      case '24h':
        startDate.setHours(now.getHours() - 24)
        break
      case '7d':
        startDate.setDate(now.getDate() - 7)
        break
      case '30d':
        startDate.setDate(now.getDate() - 30)
        break
      case '90d':
        startDate.setDate(now.getDate() - 90)
        break
      default:
        startDate.setDate(now.getDate() - 7)
    }

    // Get message statistics
    const [totalMessages, sentMessages, deliveredMessages, failedMessages] = await Promise.all([
      prisma.message.count({
        where: { userId, timestamp: { gte: startDate } }
      }),
      prisma.message.count({
        where: { userId, direction: 'OUTBOUND', timestamp: { gte: startDate } }
      }),
      prisma.message.count({
        where: { userId, status: 'DELIVERED', timestamp: { gte: startDate } }
      }),
      prisma.message.count({
        where: { userId, status: 'FAILED', timestamp: { gte: startDate } }
      })
    ])

    // Get customer statistics
    const [totalCustomers, activeCustomers] = await Promise.all([
      prisma.customer.count({
        where: { userId }
      }),
      prisma.customer.count({
        where: {
          userId,
          messages: {
            some: {
              timestamp: { gte: startDate }
            }
          }
        }
      })
    ])

    // Get template statistics
    const [totalTemplates, approvedTemplates] = await Promise.all([
      prisma.messageTemplate.count({
        where: { userId }
      }),
      prisma.messageTemplate.count({
        where: { userId, status: 'APPROVED' }
      })
    ])

    // Calculate previous period for trends
    const previousStartDate = new Date(startDate)
    const diffDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    previousStartDate.setDate(previousStartDate.getDate() - diffDays)

    const [previousMessages, previousCustomers] = await Promise.all([
      prisma.message.count({
        where: {
          userId,
          timestamp: { gte: previousStartDate, lt: startDate }
        }
      }),
      prisma.customer.count({
        where: {
          userId,
          messages: {
            some: {
              timestamp: { gte: previousStartDate, lt: startDate }
            }
          }
        }
      })
    ])

    // Calculate growth percentages
    const messagesGrowth = previousMessages > 0
      ? ((totalMessages - previousMessages) / previousMessages * 100).toFixed(1)
      : 0

    const customersGrowth = previousCustomers > 0
      ? ((activeCustomers - previousCustomers) / previousCustomers * 100).toFixed(1)
      : 0

    const deliveryRate = sentMessages > 0
      ? ((deliveredMessages / sentMessages) * 100).toFixed(1)
      : 0

    // Get template performance
    const templatePerformance = await prisma.messageTemplate.findMany({
      where: {
        userId,
        status: 'APPROVED'
      },
      select: {
        templateName: true,
        _count: {
          select: {
            messages: {
              where: {
                timestamp: { gte: startDate }
              }
            }
          }
        },
        messages: {
          where: {
            timestamp: { gte: startDate },
            status: 'DELIVERED'
          },
          select: { id: true }
        }
      },
      orderBy: {
        messages: {
          _count: 'desc'
        }
      },
      take: 5
    })

    const templateStats = templatePerformance.map(template => {
      const sent = template._count.messages
      const delivered = template.messages.length
      const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '0'

      return {
        templateName: template.templateName,
        sent,
        delivered,
        deliveryRate: parseFloat(deliveryRate)
      }
    })

    // Get message direction breakdown
    const [inboundMessages, outboundMessages] = await Promise.all([
      prisma.message.count({
        where: { userId, direction: 'INBOUND', timestamp: { gte: startDate } }
      }),
      prisma.message.count({
        where: { userId, direction: 'OUTBOUND', timestamp: { gte: startDate } }
      })
    ])

    // Calculate response rate (% of inbound messages that got a reply)
    const inboundWithReplies = await prisma.message.count({
      where: {
        userId,
        direction: 'INBOUND',
        timestamp: { gte: startDate },
        customer: {
          messages: {
            some: {
              direction: 'OUTBOUND',
              timestamp: { gte: startDate }
            }
          }
        }
      }
    })

    const responseRate = inboundMessages > 0
      ? ((inboundWithReplies / inboundMessages) * 100).toFixed(1)
      : 0

    // Get CRM metrics
    const [totalDeals, dealsByStage, leadScoreStats] = await Promise.all([
      // Total customers in pipeline
      prisma.customer.count({
        where: { userId, pipelineStageId: { not: null } }
      }),
      // Deals by stage
      prisma.pipelineStage.findMany({
        where: {
          pipeline: { userId, isDefault: true }
        },
        select: {
          id: true,
          name: true,
          color: true,
          order: true,
          _count: {
            select: { customers: true }
          }
        },
        orderBy: { order: 'asc' }
      }),
      // Lead score distribution
      prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN "leadScore" BETWEEN 0 AND 33 THEN 1 END) as low,
          COUNT(CASE WHEN "leadScore" BETWEEN 34 AND 66 THEN 1 END) as medium,
          COUNT(CASE WHEN "leadScore" >= 67 THEN 1 END) as high
        FROM "Customer"
        WHERE "userId" = ${userId}
      `
    ])

    const leadScoreDistribution = leadScoreStats[0] || { low: 0, medium: 0, high: 0 }

    // Get messages by day for chart
    const messagesByDay = await prisma.$queryRaw<Array<{ date: Date, count: bigint }>>`
      SELECT 
        DATE("timestamp") as date,
        COUNT(*)::int as count
      FROM "Message"
      WHERE "userId" = ${userId}
        AND "timestamp" >= ${startDate}
      GROUP BY DATE("timestamp")
      ORDER BY date ASC
    `

    const formattedMessagesByDay = messagesByDay.map(item => ({
      date: item.date.toISOString().split('T')[0],
      count: Number(item.count)
    }))

    const analytics = {
      overview: {
        totalMessages,
        sentMessages,
        deliveredMessages,
        failedMessages,
        totalCustomers,
        activeCustomers,
        totalTemplates,
        approvedTemplates,
        inboundMessages,
        outboundMessages,
        totalDeals
      },
      trends: {
        messagesGrowth: parseFloat(messagesGrowth.toString()),
        customersGrowth: parseFloat(customersGrowth.toString()),
        deliveryRate: parseFloat(deliveryRate.toString()),
        responseRate: parseFloat(responseRate.toString())
      },
      messageBreakdown: {
        inbound: inboundMessages,
        outbound: outboundMessages,
        inboundRate: totalMessages > 0 ? ((inboundMessages / totalMessages) * 100).toFixed(1) : 0
      },
      crmMetrics: {
        totalDeals,
        dealsByStage: dealsByStage.map(stage => ({
          name: stage.name,
          count: stage._count.customers,
          color: stage.color
        })),
        leadScoreDistribution: {
          low: Number(leadScoreDistribution.low),
          medium: Number(leadScoreDistribution.medium),
          high: Number(leadScoreDistribution.high)
        }
      },
      messagesByDay: formattedMessagesByDay,
      templatePerformance: templateStats
    }

    return c.json({ success: true, data: analytics })
  } catch (error) {
    console.error('Analytics error:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch analytics' } }, 500)
  }
})

export default app
