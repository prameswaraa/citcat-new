import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { prisma } from '../../utils/database.js'
import { auditLog } from '../../utils/auditLog.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'
import { handleValidationError, logDetailedError } from '../../middleware/errorHandler.js'

const app = new Hono()

const createCustomerSchema = z.object({
  phoneNumber: z.string().min(10),
  name: z.string().optional(),
  consentStatus: z.boolean().default(false),
  consentSource: z.string().optional(),
  consentPurpose: z.string().optional(),
  // CRM Fields
  leadScore: z.number().optional(),
  pipelineStageId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  customFields: z.array(z.object({
    fieldDefinitionId: z.string(),
    value: z.any()
  })).optional()
})

// POST /api/v1/customers - Create customer
app.post('/', async (c: Context) => {
  try {
    const body = await c.req.json()
    const data = createCustomerSchema.parse(body)

    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    // Use effectiveUserId for agents to create customers under business owner
    // Requirements: 5.4, 6.2
    const effectiveUserId = getEffectiveUserId(c)

    // Check if customer already exists (without phone number link = manual creation)
    const existing = await prisma.customer.findFirst({
      where: {
        userId: effectiveUserId,
        phoneNumber: data.phoneNumber,
        whatsappPhoneNumberId: null,
      }
    })

    if (existing) {
      return c.json({ error: { code: 'CustomerExists', message: 'Customer already exists' } }, 409)
    }

    // Validate pipelineStageId if provided
    let validPipelineStageId: string | null = null
    if (data.pipelineStageId) {
      const pipelineStage = await prisma.pipelineStage.findUnique({
        where: { id: data.pipelineStageId }
      })
      if (pipelineStage) {
        validPipelineStageId = data.pipelineStageId
      }
    }

    const customer = await prisma.customer.create({
      data: {
        userId: effectiveUserId,
        phoneNumber: data.phoneNumber,
        name: data.name,
        consentStatus: data.consentStatus,
        consentSource: data.consentSource,
        consentPurpose: data.consentPurpose,
        consentCapturedAt: data.consentStatus ? new Date() : null,
        // CRM Fields
        leadScore: data.leadScore || 0,
        pipelineStageId: validPipelineStageId,
        tags: data.tags || [],
        notes: data.notes,
        customFields: {
          create: data.customFields?.map(cf => ({
            fieldDefinitionId: cf.fieldDefinitionId,
            value: cf.value
          }))
        }
      }
    })

    // Create consent log if opted in
    if (data.consentStatus) {
      await prisma.consentLog.create({
        data: {
          customerId: customer.id,
          action: 'OPT_IN',
          source: data.consentSource || 'manual',
          purpose: data.consentPurpose,
          userId: c.user.id
        }
      })
    }

    await auditLog('CUSTOMER_CREATED', 'Customer', customer.id, {
      phoneNumber: data.phoneNumber,
      createdBy: c.user.id
    }, c.user.id)

    return c.json({ success: true, data: customer }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, c)
    }
    logDetailedError(error, { path: c.req.path, method: c.req.method })
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to create customer' } }, 500)
  }
})

export default app
