import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { prisma } from '../../utils/database.js'
import { auditLog } from '../../utils/auditLog.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'
import { handleValidationError, logDetailedError } from '../../middleware/errorHandler.js'
import { normalizePhoneNumber } from '../../utils/validation.js'

const app = new Hono()

// POST /api/v1/customers/import - Import customers from CSV
app.post('/import', async (c: Context) => {
  try {
    const body = await c.req.json()
    const { customers } = z.object({
      customers: z.array(z.object({
        phoneNumber: z.string().min(10),
        name: z.string().optional(),
        consentStatus: z.boolean().default(false),
        consentSource: z.string().optional()
      }))
    }).parse(body)

    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    // Use effectiveUserId for agents to import customers under business owner
    const effectiveUserId = getEffectiveUserId(c)

    const results = {
      success: 0,
      failed: 0,
      errors: [] as any[]
    }

    for (const customerData of customers) {
      try {
        // Normalize phone number to ensure +62xxx and 62xxx are treated as same
        const normalizedPhone = normalizePhoneNumber(customerData.phoneNumber)
        
        // Check if customer already exists (without phone number link = manual import)
        const existing = await prisma.customer.findFirst({
          where: {
            userId: effectiveUserId,
            phoneNumber: normalizedPhone,
            whatsappPhoneNumberId: null,
          }
        })

        if (existing) {
          results.failed++
          results.errors.push({
            phoneNumber: customerData.phoneNumber,
            error: 'Customer already exists'
          })
          continue
        }

        // Create customer
        const customer = await prisma.customer.create({
          data: {
            userId: effectiveUserId,
            phoneNumber: normalizedPhone,
            name: customerData.name,
            consentStatus: customerData.consentStatus,
            consentSource: customerData.consentSource || 'CSV Import',
            consentCapturedAt: customerData.consentStatus ? new Date() : null
          }
        })

        // Create consent log if opted in
        if (customerData.consentStatus) {
          await prisma.consentLog.create({
            data: {
              customerId: customer.id,
              action: 'OPT_IN',
              source: customerData.consentSource || 'CSV Import',
              userId: c.user.id
            }
          })
        }

        results.success++
      } catch (err) {
        results.failed++
        results.errors.push({
          phoneNumber: customerData.phoneNumber,
          error: err instanceof Error ? err.message : 'Unknown error'
        })
      }
    }

    await auditLog('CUSTOMERS_IMPORTED', 'Customer', effectiveUserId, {
      total: customers.length,
      success: results.success,
      failed: results.failed,
      importedBy: c.user.id
    }, c.user.id)

    return c.json({
      success: true,
      data: results,
      message: `Imported ${results.success} customers, ${results.failed} failed`
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return handleValidationError(error, c)
    }
    logDetailedError(error, { path: c.req.path, method: c.req.method })
    return c.json({ error: { code: 'InternalServerError', message: 'Failed to import customers' } }, 500)
  }
})

export default app
