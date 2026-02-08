import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { prisma } from '../../utils/database.js'
import { auditLog } from '../../utils/auditLog.js'
import WhatsAppAPI from '../../utils/whatsapp.js'
import { TokenEncryptionService } from '../../utils/tokenEncryption.js'
import { resolveCredentialsForSending, getWhatsAppAccountsForUser } from '../../utils/whatsapp-account-helper.js'
import { canSendFreeMessage } from '../../utils/messageWindow.js'
import { LeadScoringService } from '../../services/lead-scoring.js'
import { ActivityService } from '../../services/activity-service.js'
import { webhookService } from '../../services/webhook-service.js'
import { getEffectiveUserId, getActingAgentId } from '../../middleware/resolveContext.js'
import { templateRendererService, type WhatsAppTemplate, type WhatsAppTemplateComponent } from '../../services/template-renderer-service.js'
import { templateVariableService } from '../../services/template-variable-service.js'
import { templateValidatorService } from '../../services/template-validator-service.js'
import { WhatsAppErrorService } from '../../services/whatsapp-error-service.js'
import { wabaHealthService, WABAHealthService } from '../../services/waba/health-service.js'
import { disconnectService } from '../../services/disconnect-service.js'
import { AuditLogService } from '../../services/audit-log-service.js'

const app = new Hono()

/**
 * Helper function to convert DB template to WhatsAppTemplate format
 * The DB stores template data in separate fields, we need to reconstruct components
 */
function dbTemplateToWhatsAppTemplate(dbTemplate: {
  id: string;
  templateName: string;
  language: string;
  status: string;
  category: string;
  content: string;
  headerType?: string | null;
  headerContent?: string | null;
  footerContent?: string | null;
  buttons?: any;
  variables?: any;
}): WhatsAppTemplate {
  const components: WhatsAppTemplateComponent[] = []

  // Add header component if present
  if (dbTemplate.headerType && dbTemplate.headerContent) {
    components.push({
      type: 'HEADER',
      format: dbTemplate.headerType.toUpperCase() as 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT',
      text: dbTemplate.headerType.toUpperCase() === 'TEXT' ? dbTemplate.headerContent : undefined
    })
  }

  // Add body component (always present)
  components.push({
    type: 'BODY',
    text: dbTemplate.content
  })

  // Add footer component if present
  if (dbTemplate.footerContent) {
    components.push({
      type: 'FOOTER',
      text: dbTemplate.footerContent
    })
  }

  // Add buttons component if present
  if (dbTemplate.buttons && Array.isArray(dbTemplate.buttons) && dbTemplate.buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: dbTemplate.buttons
    })
  }

  return {
    id: dbTemplate.id,
    name: dbTemplate.templateName,
    language: dbTemplate.language,
    status: dbTemplate.status as 'APPROVED' | 'PENDING' | 'REJECTED',
    category: dbTemplate.category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    components
  }
}

const sendMessageSchema = z.object({
  userId: z.string().optional(), // Optional - will use effectiveUserId if not provided
  customerId: z.string().optional(),
  phoneNumber: z.string().optional(),
  type: z.enum(['text', 'template', 'image', 'document', 'interactive']),
  text: z.object({
    body: z.string(),
    preview_url: z.boolean().optional()
  }).optional(),
  template: z.object({
    name: z.string(),
    language: z.object({ code: z.string() }),
    components: z.array(z.any()).optional()
  }).optional(),
  // Template variable values for the new variable system (Requirement 4.4)
  variableValues: z.record(z.string(), z.string()).optional(),
  image: z.object({
    id: z.string().optional(),
    link: z.string().optional(),
    caption: z.string().optional()
  }).optional(),
  document: z.object({
    id: z.string().optional(),
    link: z.string().optional(),
    filename: z.string().optional(),
    caption: z.string().optional()
  }).optional(),
  interactive: z.object({
    type: z.enum(['cta_url', 'button', 'list']),
    header: z.any().optional(),
    body: z.object({ text: z.string() }).optional(),
    footer: z.object({ text: z.string() }).optional(),
    action: z.object({
      // For cta_url
      name: z.string().optional(),
      parameters: z.object({
        display_text: z.string(),
        url: z.string()
      }).optional(),
      // For button (reply buttons)
      buttons: z.array(z.object({
        type: z.literal('reply'),
        reply: z.object({
          id: z.string(),
          title: z.string()
        })
      })).max(3).optional(),
      // For list message
      button: z.string().max(20).optional(), // Button text to open list
      sections: z.array(z.object({
        title: z.string().max(24).optional(),
        rows: z.array(z.object({
          id: z.string().max(200),
          title: z.string().max(24),
          description: z.string().max(72).optional()
        })).min(1).max(10)
      })).max(10).optional()
    })
  }).optional()
})

// POST /api/v1/messages/send - Send message
app.post('/send', async (c: Context) => {
  // Store credentials info in outer scope so catch block can access them
  let resolvedWabaId: string | null = null
  let resolvedPhoneNumberId: string | null = null

  try {
    const body = await c.req.json()

    const data = sendMessageSchema.parse(body)

    // Use effectiveUserId for agents to send on behalf of business owner
    // Requirements: 5.3, 6.2, 6.3
    const effectiveUserId = getEffectiveUserId(c)
    const actingAgentId = getActingAgentId(c)
    const isAgent = c.user?.role === 'AGENT'

    // For agents, ALWAYS use effectiveUserId (business owner's ID) regardless of what's sent
    // This prevents agents from sending on behalf of other users
    // For non-agents, allow explicit userId if it matches effectiveUserId
    const targetUserId = isAgent 
      ? effectiveUserId 
      : (data.userId || effectiveUserId)

    // Check access - allow if admin or if userId matches effective user
    if (c.user?.role !== 'ADMIN' && effectiveUserId !== targetUserId) {
      return c.json({
        error: {
          code: 'Forbidden',
          message: 'Access denied'
        }
      }, 403)
    }

    // Get user (business owner)
    const user = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!user) {
      return c.json({
        error: {
          code: 'ConfigurationError',
          message: 'User not found'
        }
      }, 400)
    }

    // Resolve WhatsApp credentials (customer's linked number > primary number > any connected)
    const credentials = await resolveCredentialsForSending(targetUserId, data.customerId)

    if (!credentials) {
      return c.json({
        error: {
          code: 'ConfigurationError',
          message: 'No connected WhatsApp Business Account found. Please connect a WhatsApp account first.',
          recoveryAction: 'Go to WABA page and click "Connect WhatsApp Business" to connect'
        }
      }, 400)
    }

    const phoneNumberId = credentials.phoneNumberId
    resolvedWabaId = credentials.wabaId
    resolvedPhoneNumberId = credentials.phoneNumberId

    // Get or create customer
    let customer
    if (data.customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: data.customerId }
      })
    } else if (data.phoneNumber) {
      // Resolve phone number record for linking customer to business number
      const phoneNumberRecord = await prisma.phoneNumber.findUnique({
        where: { phoneNumberId: credentials.phoneNumberId }
      })

      // Find customer for this specific (userId, phoneNumber, whatsappPhoneNumberId) combination
      customer = await prisma.customer.findFirst({
        where: {
          userId: targetUserId,
          phoneNumber: data.phoneNumber,
          whatsappPhoneNumberId: phoneNumberRecord?.id || null,
        }
      })

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            userId: targetUserId,
            phoneNumber: data.phoneNumber,
            consentStatus: false,
            whatsappPhoneNumberId: phoneNumberRecord?.id || null,
          }
        })
      }
    }

    if (!customer) {
      return c.json({
        error: {
          code: 'CustomerRequired',
          message: 'Customer not found'
        }
      }, 400)
    }

    // For agents, verify they are assigned to this customer's conversation
    // Requirements: 5.3, 6.3 - Agents can only send messages to assigned conversations
    if (isAgent && actingAgentId) {
      const assignment = await prisma.conversationAssignment.findFirst({
        where: {
          businessOwnerId: effectiveUserId,
          conversationType: 'WHATSAPP',
          conversationId: customer.id, // customerId is the conversationId for WhatsApp
          assigneeId: actingAgentId,
          assigneeType: 'HUMAN',
          unassignedAt: null, // Only active assignments
        }
      })

      if (!assignment) {
        return c.json({
          error: {
            code: 'Forbidden',
            message: 'You are not assigned to this conversation'
          }
        }, 403)
      }
    }

    // Check 24-hour window for non-template messages
    if (data.type !== 'template') {
      const windowCheck = await canSendFreeMessage(customer.id)

      if (!windowCheck.allowed) {
        const windowStatus = windowCheck.windowStatus
        const hoursAgo = windowStatus?.windowExpiresAt
          ? Math.floor((Date.now() - new Date(windowStatus.windowExpiresAt).getTime()) / 1000 / 3600)
          : null

        return c.json({
          error: {
            code: 'WindowExpired',
            message: windowCheck.reason || '24-hour window expired. Use message template.',
            windowStatus: {
              expired: true,
              expiredAt: windowStatus?.windowExpiresAt,
              expiredHoursAgo: hoursAgo,
              lastInboundAt: windowStatus?.lastInboundMessageAt
            }
          }
        }, 403)
      }
    }

    // Check consent for marketing messages
    if (data.type === 'template' && !customer.consentStatus) {
      return c.json({
        error: {
          code: 'ConsentRequired',
          message: 'Customer has not consented'
        }
      }, 400)
    }

    // Variables for template message handling (Requirement 4.4)
    let dbTemplate: any = null
    let renderedContent: string | null = null
    let templatePayload: any = null

    // Load template from database for template messages
    if (data.type === 'template' && data.template) {
      dbTemplate = await prisma.messageTemplate.findFirst({
        where: {
          userId: targetUserId,
          templateName: data.template.name,
          language: data.template.language.code
        }
      })
    }

    // Handle template with variable values using mapping system (Requirement 4.4)
    if (data.type === 'template' && data.template && data.variableValues && Object.keys(data.variableValues).length > 0 && dbTemplate) {
      // Convert DB template to WhatsAppTemplate format
      const template = dbTemplateToWhatsAppTemplate(dbTemplate)

      // Get variable mappings
      const mappings = await templateVariableService.getMappings(targetUserId, data.template.name)

      // Translate numeric keys (from frontend manual input) to variableIds using mappings
      const processedVariableValues: Record<string, string> = { ...data.variableValues }
      const mappedVariableIds: string[] = []

      for (const [key, value] of Object.entries(data.variableValues)) {
        if (/^\d+$/.test(key)) {
          const paramIndex = parseInt(key) - 1
          // Try to find mapping for this parameter (prioritize body as it's most common)
          // Use case-insensitive comparison for componentType
          const mapping = mappings.find(m =>
            m.parameterIndex === paramIndex &&
            m.componentType.toLowerCase() === 'body'
          ) || mappings.find(m =>
            m.parameterIndex === paramIndex
          )

          if (mapping) {
            processedVariableValues[mapping.variableId] = value
            mappedVariableIds.push(mapping.variableId)
          }
        } else {
          mappedVariableIds.push(key)
        }
      }

      // Get variables for validation
      const variables = await prisma.templateVariable.findMany({
        where: {
          id: { in: mappedVariableIds },
          userId: targetUserId
        }
      })

      // Validate all variable values
      if (variables.length > 0) {
        const validationResult = templateValidatorService.validateAllVariables(
          processedVariableValues,
          variables
        )

        if (!validationResult.valid) {
          return c.json({
            error: {
              code: 'ValidationError',
              message: 'Variable validation failed',
              details: validationResult.errors
            }
          }, 400)
        }
      }

      // Build WhatsApp API payload with variables
      const builtPayload = templateRendererService.buildTemplatePayload(
        data.template.name,
        data.template.language.code,
        template,
        processedVariableValues,
        mappings
      )

      // Check if the built payload actually has valid parameters (not empty strings)
      // If it's empty or has only empty strings but frontend sent valid parameters, we prefer frontend's data
      const hasBuiltParams = builtPayload.components?.some(c =>
        c.parameters && c.parameters.some(p => p.text && p.text.trim() !== '')
      )
      const frontendHasParams = data.template?.components?.some((c: any) =>
        c.parameters && c.parameters.some((p: any) => p.text && p.text.trim() !== '')
      )

      // FIXED: If no mappings exist, don't use built payload - use frontend components directly
      if (mappings.length === 0) {
        // Keep templatePayload as null so frontend components are used
      } else if (hasBuiltParams) {
        templatePayload = builtPayload
      } else if (!frontendHasParams) {
        templatePayload = builtPayload
      }
      // else: keep templatePayload as null so it uses data.template (which has the frontend components)

      // Render template for storage
      const rendered = templateRendererService.renderTemplate(
        template,
        processedVariableValues,
        mappings
      )

      // Build content string for message record
      renderedContent = rendered.body
      if (rendered.header?.type === 'text') {
        renderedContent = `${rendered.header.content}\n\n${renderedContent}`
      }
      if (rendered.footer) {
        renderedContent = `${renderedContent}\n\n${rendered.footer}`
      }

      // Save variable history for suggestions
      if (customer) {
        const historyEntries = variables.map(v => ({
          templateName: data.template!.name,
          variableId: v.id,
          value: processedVariableValues[v.id] || '',
          customerId: customer.id
        })).filter(entry => entry.value !== '')

        if (historyEntries.length > 0) {
          await templateVariableService.saveVariableHistoryBatch(targetUserId, historyEntries).catch(err =>
            console.error('Failed to save variable history:', err)
          )

          // Increment usage count for variables
          for (const variable of variables) {
            templateVariableService.incrementUsageCount(variable.id).catch(err =>
              console.error(`Failed to increment usage count for variable ${variable.id}:`, err)
            )
          }
        }
      }
    }

    // Prepare payload for WhatsApp
    // If ID is present, we don't need to send link to WhatsApp (it might confuse the API)
    // We must deep clone or carefully clone the nested objects to avoid mutating 'data' which is used later
    const whatsappData = JSON.parse(JSON.stringify(data))

    // Check if template has variables but no components were sent
    // This catches the case where frontend didn't send variable values
    if (data.type === 'template' && dbTemplate?.content) {
      const templateVariables = dbTemplate.content.match(/\{\{(\d+)\}\}/g)
      const hasVariablesInTemplate = templateVariables && templateVariables.length > 0
      const hasComponentsSent = data.template?.components && data.template.components.length > 0

      // Check if body component has parameters (this is what frontend sends)
      const bodyComponent = data.template?.components?.find((c: any) => c.type === 'body')
      const hasBodyParameters = bodyComponent?.parameters && bodyComponent.parameters.length > 0

      // If template has variables but no components/payload were sent
      // Check if we should return an error or try to proceed
      if (hasVariablesInTemplate && !templatePayload && !hasBodyParameters && !hasComponentsSent) {
        // Extract variable numbers from template (e.g., {{1}}, {{2}})
        const varNumbers = templateVariables!.map((v: string) => parseInt(v.replace(/[{}]/g, '')))
        const uniqueVarNumbers = [...new Set(varNumbers)].sort((a: number, b: number) => a - b)

        // Return error with helpful message
        return c.json({
          error: {
            code: 'MissingVariables',
            message: `Template "${dbTemplate.templateName}" requires ${templateVariables.length} variable(s) but none were provided`,
            details: {
              requiredVariables: templateVariables.length,
              variableNumbers: uniqueVarNumbers,
              templateContent: dbTemplate.content,
              receivedComponents: data.template?.components,
              hint: 'Frontend must send template.components with body.parameters containing variable values'
            }
          }
        }, 400)
      }
    }

    // If we built a template payload with variables (from variableValues + mappings system), use it
    if (templatePayload) {
      whatsappData.template = templatePayload
    }
    // Otherwise, if frontend sent components directly (simple variable input), use as-is
    // This supports the "Fill Template Variables" dialog that sends components directly
    else if (data.type === 'template' && data.template?.components && data.template.components.length > 0) {
      // Frontend already built the correct WhatsApp API payload with components
      // Just ensure the template structure is correct
      whatsappData.template = {
        name: data.template.name,
        language: data.template.language,
        components: data.template.components
      }
    }

    // Build rendered content for message storage (for display in chat)
    // This must happen AFTER template payload is set, regardless of which path was taken
    if (data.type === 'template' && !renderedContent && dbTemplate?.content) {
      // Try to render content from template + components for storage
      const componentsToUse = whatsappData.template?.components || data.template?.components
      const bodyComponent = componentsToUse?.find((c: any) => c.type === 'body')
      
      if (bodyComponent?.parameters && bodyComponent.parameters.length > 0) {
        let content = dbTemplate.content
        bodyComponent.parameters.forEach((param: any, index: number) => {
          content = content.replace(`{{${index + 1}}}`, param.text || '')
        })
        renderedContent = content
      } else {
        // Fallback to original template content if no parameters
        renderedContent = dbTemplate.content
      }
    }

    if (whatsappData.type === 'image' && whatsappData.image?.id) {
      delete whatsappData.image.link
    } else if (whatsappData.type === 'document' && whatsappData.document?.id) {
      delete whatsappData.document.link
    } else if (whatsappData.type === 'interactive' && whatsappData.interactive) {
      // Debug: Log interactive payload for list messages
      if (whatsappData.interactive.type === 'list') {
        console.log('📋 List Message Payload:', JSON.stringify(whatsappData.interactive, null, 2))
        
        // Validate list message requirements
        if (!whatsappData.interactive.action?.button) {
          return c.json({
            error: {
              code: 'ValidationError',
              message: 'Button text is required for list messages',
              recoveryAction: 'Please provide a button text (max 20 characters)'
            }
          }, 400)
        }
        
        if (!whatsappData.interactive.action?.sections?.length) {
          return c.json({
            error: {
              code: 'ValidationError',
              message: 'At least one section is required for list messages',
              recoveryAction: 'Please add at least one section with rows'
            }
          }, 400)
        }
      }
    }

    // Create WhatsApp client with resolved account credentials
    const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken });

    const result = await whatsapp.sendMessage({
      phoneNumberId: phoneNumberId,
      to: customer.phoneNumber,
      type: data.type as any,
      ...whatsappData
    })

    // Extract media URL or ID
    let mediaUrl = null
    if (data.type === 'image') {
      mediaUrl = data.image?.link || data.image?.id
    } else if (data.type === 'document') {
      mediaUrl = data.document?.link || data.document?.id
    } else if (data.type === 'interactive') {
      // Maybe store button link?
      if (data.interactive?.action?.parameters?.url) {
        mediaUrl = data.interactive.action.parameters.url;
      }
    }

    // Extract content
    let content: string | null = null
    if (data.text?.body) {
      content = data.text.body
    } else if (data.image?.caption) {
      content = data.image.caption
    } else if (data.document?.caption) {
      content = data.document.caption
    } else if (data.type === 'interactive') {
      const bodyText = data.interactive?.body?.text || 'Interactive Message';

      // Append button info for visibility in chat history
      let buttonsText = '';
      if (data.interactive?.type === 'cta_url') {
        const label = data.interactive.action?.parameters?.display_text;
        const url = data.interactive.action?.parameters?.url;
        if (label) buttonsText += `\n[${label}](${url})`;
      } else if (data.interactive?.type === 'button' && data.interactive.action?.buttons) {
        buttonsText = '\n' + data.interactive.action.buttons
          .map((b: any) => `[${b.reply.title}]`)
          .join(' ');
      } else if (data.interactive?.type === 'list' && data.interactive.action?.sections) {
        // Format list message for chat history
        const buttonLabel = data.interactive.action?.button || 'View Options';
        buttonsText = `\n📋 [${buttonLabel}]`;
        
        // Add sections summary
        const sections = data.interactive.action.sections;
        sections.forEach((section: any) => {
          if (section.title) {
            buttonsText += `\n• ${section.title}`;
          }
          section.rows?.forEach((row: any) => {
            buttonsText += `\n  - ${row.title}`;
          });
        });
      }

      content = bodyText + buttonsText;
    } else if (data.type === 'template' && renderedContent) {
      // Use rendered content for template messages with variables (Requirement 4.4)
      content = renderedContent
    }

    // Save message with business owner's userId but track agent in metadata
    // Requirements: 6.3 - Record message with Business Owner's userId but track Agent as sender
    // Requirement 4.4 - Save rendered content to message record for template messages
    // Resolve phone number record for linking message to business number
    const msgPhoneRecord = await prisma.phoneNumber.findUnique({
      where: { phoneNumberId: credentials.phoneNumberId }
    })

    const message = await prisma.message.create({
      data: {
        userId: targetUserId,
        customerId: customer.id,
        messageType: data.type.toUpperCase() as any,
        direction: 'OUTBOUND',
        content,
        mediaUrl,
        wamId: result.messages?.[0]?.id,
        status: 'SENT',
        templateId: dbTemplate?.id || undefined,
        whatsappPhoneNumberId: msgPhoneRecord?.id || null,
      }
    })

    await auditLog(
      data.type === 'template' ? 'TEMPLATE_MESSAGE_SENT' : 'MESSAGE_SENT',
      'Message',
      message.id,
      {
        to: customer.phoneNumber,
        type: data.type,
        sentBy: c.user?.id,
        actingAgentId: actingAgentId, // Track agent if message sent by agent
        templateName: data.template?.name,
        templateLanguage: data.template?.language?.code,
        hasVariables: data.variableValues ? Object.keys(data.variableValues).length > 0 : false
      },
      c.user?.id
    )

    // Trigger lead scoring update asynchronously
    LeadScoringService.updateCustomerScore(customer.id).catch(err =>
      console.error(`Failed to update lead score for customer ${customer.id}:`, err)
    )

    // Log message activity
    if (c.user?.id) {
      ActivityService.logMessageActivity(
        customer.id,
        c.user.id,
        'sent',
        message.id,
        content?.substring(0, 100)
      ).catch(err => console.error('Failed to log message activity:', err))
    }

    // Emit webhook event for message.sent (Requirement 3.1, 8.1, 8.2, 8.4)
    // Include template information for template messages (Requirement 4.4)
    webhookService.emitEvent(
      targetUserId,
      'message.sent',
      'whatsapp',
      {
        message_id: message.id,
        customer_id: customer.id,
        customer_phone: customer.phoneNumber,
        direction: 'outbound',
        message_type: data.type,
        content: content || undefined,
        media_url: mediaUrl || undefined,
      }
    ).catch(err => console.error('Failed to emit message.sent webhook:', err))

    // Audit log: Message sent successfully
    AuditLogService.logMessageSent(targetUserId, message.id, {
      customerId: customer.id,
      customerPhone: customer.phoneNumber,
      messageType: data.type.toUpperCase(),
      wamId: result.messages?.[0]?.id,
      source: actingAgentId ? 'AGENT' : 'INBOX',
      channel: 'whatsapp',
    }).catch(err => console.error('Failed to log message sent:', err))

    // Mark WABA health issues as resolved since message was sent successfully
    if (credentials.wabaId) {
      wabaHealthService.markAsResolved(credentials.wabaId).catch(err =>
        console.error('Failed to mark WABA health as resolved:', err)
      )
    }

    return c.json({
      success: true,
      data: {
        message,
        whatsappResult: result
      }
    })
  } catch (error: any) {
    console.error('Send message error:', error.response?.data || error)
    
    // Audit log: Message send failed
    const effectiveUserId = getEffectiveUserId(c)
    const body = await c.req.json().catch(() => ({}))
    AuditLogService.logMessageSendFailed(
      effectiveUserId,
      body.customerId || body.phoneNumber || 'unknown',
      error.message || 'Unknown error',
      {
        messageType: body.type,
        errorCode: error.response?.data?.error?.code,
        errorSubcode: error.response?.data?.error?.error_subcode,
      }
    ).catch(e => console.error('Failed to log message send error:', e))
    
    // Use WhatsAppErrorService for consistent error handling (Requirement 7.1)
    const metaError = error.response?.data || error
    const errorResponse = WhatsAppErrorService.formatErrorResponse(metaError)
    const errorInfo = WhatsAppErrorService.getErrorInfo(errorResponse.error.code)
    
    // Check for phone number deleted/disconnected error (code 100 + subcode 33)
    // This indicates user has disconnected WhatsApp from their phone
    const errorCode = errorResponse.error.code
    const errorSubcode = errorResponse.error.details?.errorSubcode
    
    // =========================================
    // User-friendly error responses
    // Hide technical codes, show helpful messages
    // =========================================
    
    // Phone number deleted/disconnected (code 100 + subcode 33)
    if (errorCode === 100 && errorSubcode === 33) {
      const disconnectUserId = getEffectiveUserId(c)

      // Look up connected WhatsApp accounts for this user and auto-disconnect them
      getWhatsAppAccountsForUser(disconnectUserId, true).then(accounts => {
        for (const account of accounts) {
          disconnectService.autoDisconnectWaba(
            account.id,
            'Phone number deleted or disconnected (error 100, subcode 33)'
          ).catch(err => console.error('Failed to auto-disconnect WABA:', err))
        }
      }).catch(err => console.error('Failed to look up WhatsApp accounts for auto-disconnect:', err))
      
      return c.json({
        error: {
          code: 'PhoneNumberDisconnected',
          message: 'Nomor WhatsApp Business Anda sudah tidak terhubung. Nomor mungkin telah dihapus atau diputuskan dari WhatsApp.',
          category: 'configuration',
          retryable: false,
          recoveryAction: 'Silakan hubungkan ulang akun WhatsApp Business Anda di halaman pengaturan WABA.'
        }
      }, 400)
    }
    
    // Recipient not on WhatsApp (code 131026)
    if (errorCode === 131026) {
      return c.json({
        error: {
          code: 'RecipientNotOnWhatsApp',
          message: 'Pesan tidak dapat dikirim. Nomor penerima mungkin tidak terdaftar di WhatsApp atau menggunakan versi WhatsApp yang lama.',
          category: 'recipient',
          retryable: false,
          recoveryAction: 'Pastikan nomor penerima aktif di WhatsApp dan menggunakan versi terbaru.'
        }
      }, 400)
    }
    
    // 24-hour window expired (code 131047)
    if (errorCode === 131047) {
      return c.json({
        error: {
          code: 'WindowExpired',
          message: 'Jendela percakapan 24 jam sudah berakhir. Anda hanya bisa mengirim pesan template.',
          category: 'window',
          retryable: false,
          recoveryAction: 'Gunakan pesan template untuk memulai percakapan baru.'
        }
      }, 400)
    }
    
    // Rate limit hit (code 130429, 131048, 131056)
    if ([130429, 131048, 131056].includes(errorCode)) {
      const isSpamLimit = errorCode === 131048
      return c.json({
        error: {
          code: 'RateLimitHit',
          message: isSpamLimit 
            ? 'Pengiriman pesan dibatasi karena terlalu banyak pesan yang ditandai spam. Periksa kualitas pesan Anda.'
            : 'Terlalu banyak pesan dikirim. Silakan tunggu beberapa saat sebelum mencoba lagi.',
          category: 'throttling',
          retryable: !isSpamLimit,
          recoveryAction: isSpamLimit
            ? 'Periksa status kualitas nomor di WhatsApp Manager dan tingkatkan kualitas pesan.'
            : 'Tunggu beberapa menit sebelum mengirim pesan lagi.'
        }
      }, 400)
    }
    
    // User stopped marketing messages (code 131050)
    if (errorCode === 131050) {
      return c.json({
        error: {
          code: 'UserOptedOut',
          message: 'Penerima telah memilih untuk tidak menerima pesan marketing dari bisnis Anda.',
          category: 'recipient',
          retryable: false,
          recoveryAction: 'Hormati preferensi penerima dan jangan kirim pesan marketing ke nomor ini.'
        }
      }, 400)
    }
    
    // Template not found (code 132001)
    if (errorCode === 132001) {
      return c.json({
        error: {
          code: 'TemplateNotFound',
          message: 'Template tidak ditemukan atau belum disetujui.',
          category: 'template',
          retryable: false,
          recoveryAction: 'Periksa nama template dan pastikan template sudah disetujui. Coba sinkronkan ulang template.'
        }
      }, 400)
    }
    
    // Template paused (code 132015)
    if (errorCode === 132015) {
      return c.json({
        error: {
          code: 'TemplatePaused',
          message: 'Template sedang dijeda karena masalah kualitas.',
          category: 'template',
          retryable: false,
          recoveryAction: 'Edit template untuk meningkatkan kualitasnya atau gunakan template lain.'
        }
      }, 400)
    }
    
    // Template disabled (code 132016)
    if (errorCode === 132016) {
      return c.json({
        error: {
          code: 'TemplateDisabled',
          message: 'Template telah dinonaktifkan secara permanen karena kualitas rendah.',
          category: 'template',
          retryable: false,
          recoveryAction: 'Buat template baru dengan konten yang lebih baik.'
        }
      }, 400)
    }
    
    // Account locked/blocked (code 131031, 368)
    if ([131031, 368].includes(errorCode)) {
      return c.json({
        error: {
          code: 'AccountRestricted',
          message: 'Akun WhatsApp Business Anda dibatasi atau dikunci karena melanggar kebijakan.',
          category: 'account',
          retryable: false,
          recoveryAction: 'Periksa status akun di WhatsApp Manager dan ajukan banding jika diperlukan.'
        }
      }, 403)
    }
    
    // Access token expired (code 190)
    if (errorCode === 190) {
      return c.json({
        error: {
          code: 'TokenExpired',
          message: 'Sesi WhatsApp Anda telah berakhir.',
          category: 'authentication',
          retryable: false,
          recoveryAction: 'Silakan hubungkan ulang akun WhatsApp Business Anda.'
        }
      }, 401)
    }
    
    // Service unavailable (code 2, 131016, 133004)
    if ([2, 131016, 133004].includes(errorCode)) {
      return c.json({
        error: {
          code: 'ServiceUnavailable',
          message: 'Layanan WhatsApp sedang tidak tersedia. Silakan coba lagi dalam beberapa menit.',
          category: 'service',
          retryable: true,
          recoveryAction: 'Tunggu beberapa menit dan coba lagi.'
        }
      }, 503)
    }
    
    // Media errors (code 131052, 131053)
    if ([131052, 131053].includes(errorCode)) {
      const isDownload = errorCode === 131052
      return c.json({
        error: {
          code: 'MediaError',
          message: isDownload
            ? 'Gagal mengunduh media yang dikirim pelanggan.'
            : 'Gagal mengunggah media. Pastikan file valid dan tidak terlalu besar.',
          category: 'media',
          retryable: true,
          recoveryAction: isDownload
            ? 'Minta pelanggan mengirim ulang media.'
            : 'Periksa format dan ukuran file, lalu coba lagi.'
        }
      }, 400)
    }
    
    // Payment/billing issues (code 131042)
    if (errorCode === 131042) {
      return c.json({
        error: {
          code: 'PaymentIssue',
          message: 'Ada masalah dengan pembayaran akun WhatsApp Business Anda.',
          category: 'billing',
          retryable: false,
          recoveryAction: 'Periksa status pembayaran di Meta Business Suite.'
        }
      }, 400)
    }
    
    // Check if this is a health-related error and update WABA health status
    if (WABAHealthService.isHealthError(errorResponse.error.code)) {
      if (resolvedWabaId) {
        wabaHealthService.updateStatusFromError(
          resolvedWabaId,
          resolvedPhoneNumberId || null,
          errorResponse.error.code,
          errorResponse.error.details?.originalMessage || errorInfo.title,
          metaError
        ).catch(err => console.error('Failed to update WABA health status:', err))
      }
    }
    
    // For any other unhandled errors, return a generic user-friendly message
    // Don't expose technical error codes to users
    return c.json({
      error: {
        code: 'SendMessageFailed',
        message: 'Gagal mengirim pesan. Silakan coba lagi.',
        category: errorInfo.category.toLowerCase(),
        retryable: errorInfo.retryable,
        recoveryAction: errorInfo.retryable 
          ? 'Tunggu beberapa saat dan coba lagi.'
          : 'Jika masalah berlanjut, hubungi tim support.'
      }
    }, errorInfo.httpStatus as 400 | 401 | 403 | 404 | 500 | 503)
  }
})

export default app
