import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { resolveContext, getEffectiveUserId } from '../../middleware/resolveContext.js'

const app = new Hono()

// Apply context resolution middleware
// This ensures agents can view their business owner's template analytics
// Requirements: 6.1
app.use('*', resolveContext)

// GET /api/v1/templates/:id/analytics - Get template analytics
app.get('/:id/analytics', async (c: Context) => {
  try {
    const userId = getEffectiveUserId(c)
    
    if (!userId) {
      return c.json({
        error: {
          code: 'Unauthorized',
          message: 'Authentication required'
        }
      }, 401)
    }

    const id = c.req.param('id')

    const template = await prisma.messageTemplate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true
          }
        },
        messages: {
          select: {
            status: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 100
        }
      }
    })

    if (!template) {
      return c.json({
        error: {
          code: 'NotFound',
          message: 'Template not found'
        }
      }, 404)
    }

    // Check access - allow if admin or if template belongs to effective user (business owner)
    // For agents, effectiveUserId is their business owner's ID
    // Requirements: 6.1
    if (c.user?.role !== 'ADMIN' && userId !== template.userId) {
      return c.json({
        error: {
          code: 'Forbidden',
          message: 'Access denied'
        }
      }, 403)
    }

    // Calculate analytics
    const totalMessages = template.messages.length
    const deliveredMessages = template.messages.filter(m => m.status === 'DELIVERED').length
    const readMessages = template.messages.filter(m => m.status === 'READ').length
    const failedMessages = template.messages.filter(m => m.status === 'FAILED').length

    const analytics = {
      templateId: template.id,
      templateName: template.templateName,
      status: template.status,
      qualityRating: template.qualityRating,
      totalMessages,
      deliveredMessages,
      readMessages,
      failedMessages,
      deliveryRate: totalMessages > 0 ? (deliveredMessages / totalMessages * 100).toFixed(2) : 0,
      readRate: deliveredMessages > 0 ? (readMessages / deliveredMessages * 100).toFixed(2) : 0,
      failureRate: totalMessages > 0 ? (failedMessages / totalMessages * 100).toFixed(2) : 0
    }

    return c.json({
      success: true,
      data: analytics
    })
  } catch (error) {
    console.error('Get template analytics error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch template analytics'
      }
    }, 500)
  }
})

export default app
