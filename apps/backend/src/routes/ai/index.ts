import { Hono } from 'hono'
import type { Context } from 'hono'
import { requireRole } from '../../middleware/auth.js'
import { prisma } from '../../utils/database.js'
import { AIOrchestrator } from '../../services/ai/AIOrchestrator.js'
import { adminSettingsService } from '../../services/admin/settings-service.js'
import { checkFeatureAccess } from '../../middleware/subscription.js'
import { createMemoryVectorStore } from '../../services/ai/memory/index.js'
import { OpenAIProvider } from '../../services/ai/providers/OpenAIProvider.js'
import agents from './agents.js'
import knowledge from './knowledge.js'

const app = new Hono()
const orchestrator = new AIOrchestrator()

app.route('/agents', agents)
app.route('/knowledge', knowledge)

// GET /api/v1/ai/models - Get available AI models
app.get('/models', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    const result = await adminSettingsService.fetchOpenAIModels()
    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to fetch AI models:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: error instanceof Error ? error.message : 'Failed to fetch models',
      },
    }, 500)
  }
})

// GET /api/v1/ai/config - Get AI config
// Supports optional ?whatsappAccountId= for per-account config
app.get('/config', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')

    // Per-account config request
    if (whatsappAccountId) {
      // Verify account belongs to user
      const account = await prisma.whatsAppAccount.findFirst({
        where: { id: whatsappAccountId, userId: c.user.id },
      })
      if (!account) {
        return c.json({ error: { code: 'NotFound', message: 'WhatsApp account not found' } }, 404)
      }

      // Try per-account config
      const accountConfig = await prisma.whatsAppAccountAIConfig.findUnique({
        where: {
          userId_whatsappAccountId: { userId: c.user.id, whatsappAccountId },
        },
      })

      if (accountConfig) {
        return c.json({ success: true, data: accountConfig, isCustomized: true })
      }

      // Fall back to user-level config (return with isCustomized: false)
      let userConfig = await prisma.aIConfig.findUnique({
        where: { userId: c.user.id },
      })
      if (!userConfig) {
        userConfig = await prisma.aIConfig.create({
          data: { userId: c.user.id },
        })
      }
      return c.json({ success: true, data: userConfig, isCustomized: false })
    }

    // Global config (existing behavior)
    const config = await prisma.aIConfig.findUnique({
      where: { userId: c.user.id },
    })

    if (!config) {
      const newConfig = await prisma.aIConfig.create({
        data: { userId: c.user.id },
      })
      return c.json({ success: true, data: newConfig })
    }

    return c.json({ success: true, data: config })
  } catch (error) {
    console.error('Failed to fetch AI config:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to fetch AI config' } }, 500)
  }
})

// POST /api/v1/ai/config - Update AI config
// Supports optional ?whatsappAccountId= for per-account config
app.post('/config', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const body = await c.req.json()

    // SECURITY: Check AI feature access before allowing config changes
    // Only check if user is trying to enable AI
    if (body.enabled === true) {
      const hasAccess = await checkFeatureAccess(c.user.id, 'aiChatbot')
      if (!hasAccess) {
        return c.json({ 
          error: { 
            code: 'Forbidden', 
            message: 'AI Chatbot is not available in your current plan. Please upgrade to LITE or higher.' 
          } 
        }, 403)
      }
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')

    // Per-account config update
    if (whatsappAccountId) {
      // Verify account belongs to user
      const account = await prisma.whatsAppAccount.findFirst({
        where: { id: whatsappAccountId, userId: c.user.id },
      })
      if (!account) {
        return c.json({ error: { code: 'NotFound', message: 'WhatsApp account not found' } }, 404)
      }

      const updatedConfig = await prisma.whatsAppAccountAIConfig.upsert({
        where: {
          userId_whatsappAccountId: { userId: c.user.id, whatsappAccountId },
        },
        create: {
          userId: c.user.id,
          whatsappAccountId,
          enabled: body.enabled ?? false,
          activeAgentId: body.activeAgentId ?? null,
          temperature: body.temperature ?? 0.7,
          filterWords: body.filterWords ?? null,
        },
        update: {
          enabled: body.enabled,
          activeAgentId: body.activeAgentId,
          temperature: body.temperature,
          filterWords: body.filterWords,
        },
      })

      return c.json({ success: true, data: updatedConfig })
    }

    // Global config update (existing behavior)
    const updatedConfig = await prisma.aIConfig.update({
      where: { userId: c.user.id },
      data: {
        enabled: body.enabled,
        model: body.model,
        temperature: body.temperature,
        filterWords: body.filterWords,
        activeAgentId: body.activeAgentId,
      },
    })

    return c.json({ success: true, data: updatedConfig })
  } catch (error) {
    console.error('Failed to update AI config:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to update AI config' } }, 500)
  }
})

// DELETE /api/v1/ai/config - Delete per-account config (revert to global defaults)
app.delete('/config', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')
    if (!whatsappAccountId) {
      return c.json({ error: { code: 'BadRequest', message: 'whatsappAccountId is required' } }, 400)
    }

    await prisma.whatsAppAccountAIConfig.deleteMany({
      where: { userId: c.user.id, whatsappAccountId },
    })

    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete per-account AI config:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to delete config' } }, 500)
  }
})

// GET /api/v1/ai/memory/count - Get memory count for a WhatsApp account
app.get('/memory/count', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')
    if (!whatsappAccountId) {
      return c.json({ error: { code: 'BadRequest', message: 'whatsappAccountId is required' } }, 400)
    }

    // Verify account belongs to user
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: whatsappAccountId, userId: c.user.id },
    })
    if (!account) {
      return c.json({ error: { code: 'NotFound', message: 'WhatsApp account not found' } }, 404)
    }

    const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY || '')
    const memoryStore = createMemoryVectorStore(openaiProvider)
    const count = await memoryStore.getCountByWhatsAppAccountId(c.user.id, whatsappAccountId)

    return c.json({ success: true, data: { count } })
  } catch (error) {
    console.error('Failed to get memory count:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to get memory count' } }, 500)
  }
})

// DELETE /api/v1/ai/memory - Delete all memories for a WhatsApp account
app.delete('/memory', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')
    if (!whatsappAccountId) {
      return c.json({ error: { code: 'BadRequest', message: 'whatsappAccountId is required' } }, 400)
    }

    // Verify account belongs to user
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: whatsappAccountId, userId: c.user.id },
    })
    if (!account) {
      return c.json({ error: { code: 'NotFound', message: 'WhatsApp account not found' } }, 404)
    }

    const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY || '')
    const memoryStore = createMemoryVectorStore(openaiProvider)
    const deletedCount = await memoryStore.deleteByWhatsAppAccountId(c.user.id, whatsappAccountId)

    return c.json({ success: true, data: { deletedCount } })
  } catch (error) {
    console.error('Failed to delete memories:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to delete memories' } }, 500)
  }
})

// GET /api/v1/ai/memory/customers - Get list of customers with memory for a WhatsApp account (paginated)
app.get('/memory/customers', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')
    if (!whatsappAccountId) {
      return c.json({ error: { code: 'BadRequest', message: 'whatsappAccountId is required' } }, 400)
    }

    // Pagination params
    const page = parseInt(c.req.query('page') || '1', 10)
    const limit = parseInt(c.req.query('limit') || '20', 10)
    const search = c.req.query('search') || ''

    // Verify account belongs to user
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: whatsappAccountId, userId: c.user.id },
    })
    if (!account) {
      return c.json({ error: { code: 'NotFound', message: 'WhatsApp account not found' } }, 404)
    }

    const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY || '')
    const memoryStore = createMemoryVectorStore(openaiProvider)
    const result = await memoryStore.getCustomersWithMemory(c.user.id, whatsappAccountId, {
      page,
      limit,
      search,
    })

    return c.json({ success: true, data: result })
  } catch (error) {
    console.error('Failed to get customers with memory:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to get customers' } }, 500)
  }
})

// DELETE /api/v1/ai/memory/customer - Delete memories for a specific customer
app.delete('/memory/customer', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const whatsappAccountId = c.req.query('whatsappAccountId')
    const customerId = c.req.query('customerId')
    
    if (!whatsappAccountId) {
      return c.json({ error: { code: 'BadRequest', message: 'whatsappAccountId is required' } }, 400)
    }
    if (!customerId) {
      return c.json({ error: { code: 'BadRequest', message: 'customerId is required' } }, 400)
    }

    // Verify account belongs to user
    const account = await prisma.whatsAppAccount.findFirst({
      where: { id: whatsappAccountId, userId: c.user.id },
    })
    if (!account) {
      return c.json({ error: { code: 'NotFound', message: 'WhatsApp account not found' } }, 404)
    }

    const openaiProvider = new OpenAIProvider(process.env.OPENAI_API_KEY || '')
    const memoryStore = createMemoryVectorStore(openaiProvider)
    const deletedCount = await memoryStore.deleteByCustomerId(c.user.id, whatsappAccountId, customerId)

    return c.json({ success: true, data: { deletedCount } })
  } catch (error) {
    console.error('Failed to delete customer memories:', error)
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to delete memories' } }, 500)
  }
})

// POST /api/v1/ai/test-chat - Test chat with AI agent
app.post('/test-chat', requireRole(['ADMIN', 'BUSINESS_OWNER']), async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const { message, agentId } = await c.req.json()

    if (!message || typeof message !== 'string') {
      return c.json({ error: { code: 'BadRequest', message: 'Message is required' } }, 400)
    }

    if (!agentId) {
      return c.json({ error: { code: 'BadRequest', message: 'Agent ID is required' } }, 400)
    }

    // Verify the agent belongs to this user
    const agent = await prisma.aIAgent.findFirst({
      where: { id: agentId, userId: c.user.id },
    })

    if (!agent) {
      return c.json({ error: { code: 'NotFound', message: 'Agent not found' } }, 404)
    }

    // Use the orchestrator to generate a response
    const response = await orchestrator.handleMessage(
      c.user.id,
      message,
      undefined, // No customer ID for test
      agentId    // Use specific agent
    )

    if (!response) {
      return c.json({
        success: true,
        data: {
          response: 'AI tidak dapat merespons. Pastikan AI sudah diaktifkan dan agent memiliki knowledge base.',
          isError: true,
        },
      })
    }

    return c.json({
      success: true,
      data: {
        response,
        isError: false,
      },
    })
  } catch (error) {
    console.error('Failed to test chat:', error)
    return c.json({
      error: {
        code: 'InternalServerError',
        message: error instanceof Error ? error.message : 'Failed to generate response',
      },
    }, 500)
  }
})

export default app
