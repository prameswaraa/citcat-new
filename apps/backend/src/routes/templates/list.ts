import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { templateCacheService } from '../../services/template-cache-service.js'
import { resolveContext, getEffectiveUserId } from '../../middleware/resolveContext.js'

const app = new Hono()

// Apply context resolution middleware
// This ensures agents can list their business owner's templates
// Requirements: 6.1
app.use('*', resolveContext)

// GET /api/v1/templates - List templates from database
// Templates are synced from Meta via POST /api/v1/templates/sync
// Only returns templates from connected WhatsApp accounts
app.get('/', async (c: Context) => {
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

    // Filter by status if provided
    const status = c.req.query('status') || undefined
    const category = c.req.query('category') || undefined
    const includeDisconnected = c.req.query('includeDisconnected') === 'true'
    const filters = { status, category }

    // Skip cache for now to debug - always fetch fresh data
    // TODO: Re-enable cache after debugging
    // const cached = await templateCacheService.getTemplateList(userId, filters)
    // if (cached) {
    //   return c.json({
    //     success: true,
    //     data: cached
    //   })
    // }

    // Get connected WhatsApp accounts for this user
    const connectedAccounts = await prisma.whatsAppAccount.findMany({
      where: {
        userId,
        connectionStatus: 'connected'
      },
      select: { id: true }
    })
    const connectedAccountIds = connectedAccounts.map(a => a.id)

    const where: any = { userId }

    // Filter by WhatsApp account (multi-number support)
    const whatsappAccountId = c.req.query('whatsappAccountId') || undefined
    if (whatsappAccountId) {
      where.whatsappAccountId = whatsappAccountId
    } else if (!includeDisconnected && connectedAccountIds.length > 0) {
      // Only show templates from connected WhatsApp accounts
      // Unless explicitly requesting all templates (includeDisconnected=true)
      where.whatsappAccountId = { in: connectedAccountIds }
    } else if (!includeDisconnected && connectedAccountIds.length === 0) {
      // No connected accounts - return empty list
      console.log(`📋 No connected WhatsApp accounts for userId: ${userId}`)
      return c.json({
        success: true,
        data: []
      })
    }

    if (status) {
      where.status = status
    }

    if (category) {
      where.category = category
    }

    console.log(`📋 Listing templates for userId: ${userId}, connectedAccounts: ${connectedAccountIds.length}, where:`, where)
    
    const templates = await prisma.messageTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📋 Found ${templates.length} templates:`, templates.map(t => `${t.templateName} (userId: ${t.userId})`))

    // Add hasVariables field to each template for frontend convenience
    const templatesWithVariableInfo = templates.map(t => ({
      ...t,
      hasVariables: !!(t.content?.match(/\{\{(\d+)\}\}/g)?.length)
    }))

    // Cache the result
    await templateCacheService.setTemplateList(userId, templatesWithVariableInfo, filters)

    return c.json({
      success: true,
      data: templatesWithVariableInfo
    })
  } catch (error) {
    console.error('List templates error:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: 'Failed to fetch templates'
      }
    }, 500)
  }
})

export default app
