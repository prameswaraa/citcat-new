import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { prisma } from '../../../../utils/database.js';
import { WhatsAppAPI } from '../../../../utils/whatsapp.js';
import { canSendFreeMessage } from '../../../../utils/messageWindow.js';
import { instagramService } from '../../../../services/InstagramService.js';
import * as messengerService from '../../../../services/messenger/index.js';
import { MessengerError } from '../../../../services/messenger/errors.js';
import { getApiKeyUserId } from '../../../../middleware/apiKeyAuth.js';
import { combinedSendRateLimiter, channelAwareSendRateLimiter } from '../../../../middleware/publicApiRateLimiter.js';
import { logger } from '../../../../utils/logger.js';
import { webhookService } from '../../../../services/webhook-service.js';
import { handleValidationError, handleError } from '../../../../middleware/errorHandler.js';
import { resolveCredentialsForSending } from '../../../../utils/whatsapp-account-helper.js';
import { WhatsAppErrorService } from '../../../../services/whatsapp-error-service.js';

const app = new Hono();

// WhatsApp message types
const WHATSAPP_MESSAGE_TYPES = ['text', 'image', 'document', 'audio', 'video', 'template', 'interactive'] as const;
// Instagram message types
const INSTAGRAM_MESSAGE_TYPES = ['text', 'image', 'media_share'] as const;
// Messenger message types
const MESSENGER_MESSAGE_TYPES = ['text', 'image', 'video', 'audio', 'file'] as const;

// Content length limits
const WHATSAPP_TEXT_MAX_LENGTH = 4096;
const INSTAGRAM_TEXT_MAX_LENGTH = 1000;
const MAX_MEDIA_SIZE_BYTES = 16 * 1024 * 1024; // 16MB

// Interactive message schemas for WhatsApp
const ctaUrlActionSchema = z.object({
  type: z.literal('cta_url'),
  body: z.object({ text: z.string().max(1024) }),
  header: z.object({
    type: z.enum(['text', 'image', 'video', 'document']),
    text: z.string().max(60).optional(),
    image: z.object({ link: z.string().url() }).optional(),
    video: z.object({ link: z.string().url() }).optional(),
    document: z.object({ link: z.string().url(), filename: z.string().optional() }).optional(),
  }).optional(),
  footer: z.object({ text: z.string().max(60) }).optional(),
  action: z.object({
    name: z.literal('cta_url'),
    parameters: z.object({
      display_text: z.string().max(20),
      url: z.string().url(),
    }),
  }),
});

const replyButtonSchema = z.object({
  type: z.literal('reply'),
  reply: z.object({
    id: z.string().max(256),
    title: z.string().max(20),
  }),
});

const buttonActionSchema = z.object({
  type: z.literal('button'),
  body: z.object({ text: z.string().max(1024) }),
  header: z.object({
    type: z.enum(['text', 'image', 'video', 'document']),
    text: z.string().max(60).optional(),
    image: z.object({ link: z.string().url() }).optional(),
    video: z.object({ link: z.string().url() }).optional(),
    document: z.object({ link: z.string().url(), filename: z.string().optional() }).optional(),
  }).optional(),
  footer: z.object({ text: z.string().max(60) }).optional(),
  action: z.object({
    buttons: z.array(replyButtonSchema).min(1).max(3),
  }),
});

const listRowSchema = z.object({
  id: z.string().max(200),
  title: z.string().max(24),
  description: z.string().max(72).optional(),
});

const listSectionSchema = z.object({
  title: z.string().max(24).optional(),
  rows: z.array(listRowSchema).min(1).max(10),
});

const listActionSchema = z.object({
  type: z.literal('list'),
  body: z.object({ text: z.string().max(1024) }),
  header: z.object({
    type: z.literal('text'),
    text: z.string().max(60),
  }).optional(),
  footer: z.object({ text: z.string().max(60) }).optional(),
  action: z.object({
    button: z.string().max(20),
    sections: z.array(listSectionSchema).min(1).max(10),
  }),
});

const interactiveSchema = z.union([ctaUrlActionSchema, buttonActionSchema, listActionSchema]);

// Validation schema for send message
const sendMessageSchema = z.object({
  customer_id: z.string().optional(),
  phone_number: z.string().optional(),
  instagram_username: z.string().optional(),
  channel: z.enum(['whatsapp', 'instagram', 'messenger']),
  message_type: z.string(),
  content: z.string().optional(),
  media_url: z.string().url().optional(),
  // WhatsApp template specific
  template: z.object({
    name: z.string(),
    language: z.object({ code: z.string() }),
    components: z.array(z.any()).optional(),
  }).optional(),
  // WhatsApp document specific
  filename: z.string().optional(),
  caption: z.string().optional(),
  // WhatsApp interactive specific (CTA URL buttons, Reply buttons)
  interactive: interactiveSchema.optional(),
  // Multi-account support: specify which account/number to use
  whatsapp_phone_number_id: z.string().optional(),
  instagram_account_id: z.string().optional(),
  facebook_page_id: z.string().optional(),
  // Auto-create customer options (for WhatsApp template messages to new numbers)
  customer_name: z.string().optional(),
  auto_create_customer: z.boolean().optional().default(true),
}).refine(
  (data) => data.customer_id || data.phone_number || data.instagram_username,
  {
    message: "Either customer_id, phone_number, or instagram_username is required",
    path: ['customer_id']
  }
);

/**
 * POST /api/v1/messages/send
 * Send a message to a customer via WhatsApp, Instagram, or Messenger
 * 
 * Rate limits (per Meta's official limits 2026 with 10% safety buffer):
 * - WhatsApp: 60 msg/min (Meta: 80 msg/sec default)
 * - Instagram: 180 msg/hour (Meta: 200 msg/hour)
 * - Messenger: 180 msg/hour (Meta: ~200 msg/hour)
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
app.post('/send', channelAwareSendRateLimiter, async (c: Context) => {
  const startTime = Date.now();
  
  try {
    const userId = getApiKeyUserId(c);
    
    // Use pre-parsed body from rate limiter if available, otherwise parse
    const body = c.get('parsedBody') || await c.req.json();
    
    // Validate request body
    const parseResult = sendMessageSchema.safeParse(body);
    if (!parseResult.success) {
      return handleValidationError(parseResult.error, c);
    }
    
    const data = parseResult.data;
    
    // Validate message type per channel
    if (data.channel === 'whatsapp') {
      if (!WHATSAPP_MESSAGE_TYPES.includes(data.message_type as any)) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: `Invalid message_type for WhatsApp. Allowed types: ${WHATSAPP_MESSAGE_TYPES.join(', ')}`,
          },
        }, 400);
      }
    } else if (data.channel === 'instagram') {
      if (!INSTAGRAM_MESSAGE_TYPES.includes(data.message_type as any)) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: `Invalid message_type for Instagram. Allowed types: ${INSTAGRAM_MESSAGE_TYPES.join(', ')}`,
          },
        }, 400);
      }
    } else if (data.channel === 'messenger') {
      if (!MESSENGER_MESSAGE_TYPES.includes(data.message_type as any)) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: `Invalid message_type for Messenger. Allowed types: ${MESSENGER_MESSAGE_TYPES.join(', ')}`,
          },
        }, 400);
      }
    }
    
    // Validate content length
    if (data.content) {
      if (data.channel === 'whatsapp' && data.content.length > WHATSAPP_TEXT_MAX_LENGTH) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: `Content exceeds maximum length of ${WHATSAPP_TEXT_MAX_LENGTH} characters for WhatsApp`,
            details: [{ field: 'content', message: `Maximum ${WHATSAPP_TEXT_MAX_LENGTH} characters allowed` }],
          },
        }, 400);
      }
      if (data.channel === 'instagram' && data.content.length > INSTAGRAM_TEXT_MAX_LENGTH) {
        return c.json({
          error: {
            code: 'ValidationError',
            message: `Content exceeds maximum length of ${INSTAGRAM_TEXT_MAX_LENGTH} characters for Instagram`,
            details: [{ field: 'content', message: `Maximum ${INSTAGRAM_TEXT_MAX_LENGTH} characters allowed` }],
          },
        }, 400);
      }
    }
    
    // Require content for text messages
    if (data.message_type === 'text' && !data.content) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'content is required for text messages',
        },
      }, 400);
    }
    
    // Require media_url for media messages
    if (['image', 'document', 'audio', 'video', 'media_share'].includes(data.message_type) && !data.media_url) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'media_url is required for media messages',
        },
      }, 400);
    }
    
    // Require template for template messages
    if (data.message_type === 'template' && !data.template) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'template object is required for template messages',
        },
      }, 400);
    }
    
    // Require interactive for interactive messages
    if (data.message_type === 'interactive' && !data.interactive) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'interactive object is required for interactive messages',
        },
      }, 400);
    }
    
    // Get customer and verify ownership
    // Support customer_id (CUID), phone_number, or instagram_username lookup
    let customer;
    let customerCreated = false;
    
    if (data.customer_id) {
      customer = await prisma.customer.findUnique({
        where: { id: data.customer_id },
        include: {
          igConversations: {
            include: {
              instagramAccount: true,
            },
          },
          messengerConversations: {
            include: {
              facebookPage: true,
            },
          },
        },
      });
    } else if (data.phone_number) {
      customer = await prisma.customer.findFirst({
        where: {
          userId: userId,
          phoneNumber: data.phone_number
        },
        include: {
          igConversations: {
            include: {
              instagramAccount: true,
            },
          },
          messengerConversations: {
            include: {
              facebookPage: true,
            },
          },
        },
      });
      
      // Auto-create customer for WhatsApp template messages if not found
      if (!customer && data.channel === 'whatsapp' && data.message_type === 'template' && data.auto_create_customer !== false) {
        // Normalize phone number (ensure it starts with country code, no + prefix)
        let normalizedPhone = data.phone_number.replace(/^\+/, '').replace(/\s/g, '');
        
        // Create new customer with consent for template messages
        customer = await prisma.customer.create({
          data: {
            userId: userId,
            phoneNumber: normalizedPhone,
            name: data.customer_name || `Customer ${normalizedPhone.slice(-4)}`,
            consentStatus: true, // Template messages require consent, assume opt-in
            consentCapturedAt: new Date(),
            consentSource: 'PUBLIC_API',
            consentPurpose: 'Template message via Public API',
          },
          include: {
            igConversations: {
              include: {
                instagramAccount: true,
              },
            },
            messengerConversations: {
              include: {
                facebookPage: true,
              },
            },
          },
        });
        customerCreated = true;
        
        logger.info(`Auto-created customer ${customer.id} for phone ${normalizedPhone}`);
      }
    } else if (data.instagram_username) {
      customer = await prisma.customer.findFirst({
        where: {
          userId: userId,
          instagramUsername: data.instagram_username
        },
        include: {
          igConversations: {
            include: {
              instagramAccount: true,
            },
          },
          messengerConversations: {
            include: {
              facebookPage: true,
            },
          },
        },
      });
    }
    
    if (!customer) {
      // Provide helpful error message based on context
      if (data.phone_number && data.channel === 'whatsapp' && data.message_type !== 'template') {
        return c.json({
          error: {
            code: 'NotFound',
            message: 'Customer not found. For non-template messages, customer must exist. Use message_type: "template" to auto-create customer.',
          },
        }, 404);
      }
      return c.json({
        error: {
          code: 'NotFound',
          message: 'Customer not found',
        },
      }, 404);
    }
    
    if (customer.userId !== userId) {
      return c.json({
        error: {
          code: 'Forbidden',
          message: 'Customer does not belong to authenticated user',
        },
      }, 403);
    }
    
    // Route to appropriate channel handler
    if (data.channel === 'whatsapp') {
      return await sendWhatsAppMessage(c, userId, customer, data, customerCreated);
    } else if (data.channel === 'instagram') {
      return await sendInstagramMessage(c, userId, customer, data);
    } else {
      return await sendMessengerMessage(c, userId, customer, data);
    }
    
  } catch (error: any) {
    logger.error('Public API send message error:', error);
    
    return c.json({
      error: {
        code: 'InternalError',
        message: 'Failed to send message',
      },
    }, 500);
  }
});

/**
 * Send message via WhatsApp
 * Supports multi-number: use whatsapp_phone_number_id to specify which phone number to use
 */
async function sendWhatsAppMessage(
  c: Context,
  userId: string,
  customer: any,
  data: z.infer<typeof sendMessageSchema>,
  customerCreated: boolean = false
) {
  // Resolve WhatsApp credentials, with optional phone number override
  const credentials = await resolveCredentialsForSending(userId, customer.id, data.whatsapp_phone_number_id);

  if (!credentials) {
    // If override was specified but not found, give specific error
    if (data.whatsapp_phone_number_id) {
      return c.json({
        error: {
          code: 'NotFound',
          message: 'WhatsApp phone number not found, not connected, or does not belong to you',
        },
      }, 404);
    }
    return c.json({
      error: {
        code: 'ConfigurationError',
        message: 'WhatsApp Business Account not connected or no phone number available',
        recoveryAction: 'Connect your WhatsApp Business Account first',
      },
    }, 400);
  }

  if (!customer.phoneNumber) {
    return c.json({
      error: {
        code: 'ValidationError',
        message: 'Customer does not have a phone number for WhatsApp',
      },
    }, 400);
  }
  
  // Check 24-hour window for non-template messages
  if (data.message_type !== 'template') {
    const windowCheck = await canSendFreeMessage(customer.id);
    
    if (!windowCheck.allowed) {
      return c.json({
        error: {
          code: 'WindowClosed',
          message: windowCheck.reason || '24-hour messaging window expired. Use template message.',
          windowStatus: {
            expired: true,
            expiredAt: windowCheck.windowStatus?.windowExpiresAt,
          },
        },
      }, 400);
    }
  }
  
  // Build WhatsApp message payload with per-account token
  const whatsapp = new WhatsAppAPI({ accessToken: credentials.accessToken });
  let messagePayload: any = {
    phoneNumberId: credentials.phoneNumberId,
    to: customer.phoneNumber,
    type: data.message_type,
  };
  
  switch (data.message_type) {
    case 'text':
      messagePayload.text = { body: data.content };
      break;
    case 'template':
      messagePayload.template = data.template;
      break;
    case 'image':
      messagePayload.image = { link: data.media_url, caption: data.caption };
      break;
    case 'document':
      messagePayload.document = { link: data.media_url, filename: data.filename, caption: data.caption };
      break;
    case 'audio':
      messagePayload.audio = { link: data.media_url };
      break;
    case 'video':
      messagePayload.video = { link: data.media_url, caption: data.caption };
      break;
    case 'interactive':
      messagePayload.interactive = data.interactive;
      break;
  }
  
  // Send via WhatsApp API with detailed error handling
  let result: any;
  try {
    result = await whatsapp.sendMessage(messagePayload);
  } catch (waError: any) {
    logger.error('WhatsApp API error:', waError);
    
    // Use WhatsAppErrorService for consistent error handling
    const metaError = waError?.response?.data || waError;
    const errorResponse = WhatsAppErrorService.formatErrorResponse(metaError);
    const errorInfo = WhatsAppErrorService.getErrorInfo(errorResponse.error.code);
    const errorCode = errorResponse.error.code;
    const errorSubcode = errorResponse.error.details?.errorSubcode;
    
    // =========================================
    // User-friendly error responses (Indonesian)
    // Structured for Public API consumers
    // =========================================
    
    // Recipient not on WhatsApp (code 131026)
    if (errorCode === 131026) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'RecipientNotOnWhatsApp',
          message: 'Pesan tidak dapat dikirim. Nomor penerima mungkin tidak terdaftar di WhatsApp atau menggunakan versi WhatsApp yang lama.',
          recovery_action: 'Pastikan nomor penerima aktif di WhatsApp dan menggunakan versi terbaru.',
          category: 'recipient',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // 24-hour window expired (code 131047)
    if (errorCode === 131047) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'WindowExpired',
          message: 'Jendela percakapan 24 jam sudah berakhir. Anda hanya bisa mengirim pesan template.',
          recovery_action: 'Gunakan pesan template untuk memulai percakapan baru.',
          category: 'window',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Rate limit hit (code 130429, 131048, 131056)
    if ([130429, 131048, 131056].includes(errorCode)) {
      const isSpamLimit = errorCode === 131048;
      return c.json({
        error: {
          code: errorCode,
          error_code: 'RateLimitHit',
          message: isSpamLimit 
            ? 'Pengiriman pesan dibatasi karena terlalu banyak pesan yang ditandai spam.'
            : 'Terlalu banyak pesan dikirim. Silakan tunggu beberapa saat sebelum mencoba lagi.',
          recovery_action: isSpamLimit
            ? 'Periksa status kualitas nomor di WhatsApp Manager dan tingkatkan kualitas pesan.'
            : 'Tunggu beberapa menit sebelum mengirim pesan lagi.',
          category: 'throttling',
          retryable: !isSpamLimit,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 429);
    }
    
    // User stopped marketing messages (code 131050)
    if (errorCode === 131050) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'UserOptedOut',
          message: 'Penerima telah memilih untuk tidak menerima pesan marketing dari bisnis Anda.',
          recovery_action: 'Hormati preferensi penerima dan jangan kirim pesan marketing ke nomor ini.',
          category: 'recipient',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Template not found (code 132001)
    if (errorCode === 132001) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'TemplateNotFound',
          message: 'Template tidak ditemukan atau belum disetujui.',
          recovery_action: 'Periksa nama template dan pastikan template sudah disetujui. Coba sinkronkan ulang template.',
          category: 'template',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 404);
    }
    
    // Template param count mismatch (code 132000)
    if (errorCode === 132000) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'TemplateParamMismatch',
          message: 'Jumlah parameter tidak sesuai dengan template. Periksa variabel yang dikirim.',
          recovery_action: 'Pastikan jumlah dan format parameter sesuai dengan definisi template.',
          category: 'template',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Template paused (code 132015)
    if (errorCode === 132015) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'TemplatePaused',
          message: 'Template sedang dijeda karena masalah kualitas.',
          recovery_action: 'Edit template untuk meningkatkan kualitasnya atau gunakan template lain.',
          category: 'template',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Template disabled (code 132016)
    if (errorCode === 132016) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'TemplateDisabled',
          message: 'Template telah dinonaktifkan secara permanen karena kualitas rendah.',
          recovery_action: 'Buat template baru dengan konten yang lebih baik.',
          category: 'template',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Template hydrated text too long (code 132005)
    if (errorCode === 132005) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'TemplateTextTooLong',
          message: 'Teks template setelah digabung dengan parameter terlalu panjang.',
          recovery_action: 'Kurangi panjang teks parameter yang dikirim.',
          category: 'template',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Account locked/blocked (code 131031, 368)
    if ([131031, 368].includes(errorCode)) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'AccountRestricted',
          message: 'Akun WhatsApp Business Anda dibatasi atau dikunci karena melanggar kebijakan.',
          recovery_action: 'Periksa status akun di WhatsApp Manager dan ajukan banding jika diperlukan.',
          category: 'account',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 403);
    }
    
    // Access token expired (code 190)
    if (errorCode === 190) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'TokenExpired',
          message: 'Sesi WhatsApp Anda telah berakhir.',
          recovery_action: 'Silakan hubungkan ulang akun WhatsApp Business Anda.',
          category: 'authentication',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 401);
    }
    
    // Phone number deleted/disconnected (code 100 + subcode 33)
    if (errorCode === 100 && errorSubcode === 33) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'PhoneNumberDisconnected',
          message: 'Nomor WhatsApp Business Anda sudah tidak terhubung. Nomor mungkin telah dihapus atau diputuskan dari WhatsApp.',
          recovery_action: 'Silakan hubungkan ulang akun WhatsApp Business Anda di halaman pengaturan WABA.',
          category: 'configuration',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Service unavailable (code 2, 131016, 133004)
    if ([2, 131016, 133004].includes(errorCode)) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'ServiceUnavailable',
          message: 'Layanan WhatsApp sedang tidak tersedia. Silakan coba lagi dalam beberapa menit.',
          recovery_action: 'Tunggu beberapa menit dan coba lagi.',
          category: 'service',
          retryable: true,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 503);
    }
    
    // Media errors (code 131052, 131053)
    if ([131052, 131053].includes(errorCode)) {
      const isDownload = errorCode === 131052;
      return c.json({
        error: {
          code: errorCode,
          error_code: 'MediaError',
          message: isDownload
            ? 'Gagal mengunduh media yang dikirim pelanggan.'
            : 'Gagal mengunggah media. Pastikan file valid dan tidak terlalu besar.',
          recovery_action: isDownload
            ? 'Minta pelanggan mengirim ulang media.'
            : 'Periksa format dan ukuran file, lalu coba lagi.',
          category: 'media',
          retryable: true,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // Payment/billing issues (code 131042)
    if (errorCode === 131042) {
      return c.json({
        error: {
          code: errorCode,
          error_code: 'PaymentIssue',
          message: 'Ada masalah dengan pembayaran akun WhatsApp Business Anda.',
          recovery_action: 'Periksa status pembayaran di Meta Business Suite.',
          category: 'billing',
          retryable: false,
          details: { original_message: errorResponse.error.details?.originalMessage },
        },
      }, 400);
    }
    
    // For any other unhandled errors, return a generic user-friendly message
    return c.json({
      error: {
        code: errorCode,
        error_code: 'WhatsAppError',
        message: 'Gagal mengirim pesan. Silakan coba lagi.',
        recovery_action: errorInfo.retryable 
          ? 'Tunggu beberapa saat dan coba lagi.'
          : 'Jika masalah berlanjut, hubungi tim support.',
        category: errorInfo.category.toLowerCase(),
        retryable: errorInfo.retryable,
        details: { original_message: errorResponse.error.details?.originalMessage },
      },
    }, errorInfo.httpStatus as 400 | 401 | 403 | 404 | 500 | 503);
  }
  
  // Save message to database
  const message = await prisma.message.create({
    data: {
      userId,
      customerId: customer.id,
      messageType: data.message_type.toUpperCase() as any,
      direction: 'OUTBOUND',
      content: data.content || data.caption || null,
      mediaUrl: data.media_url || null,
      wamId: result.messages?.[0]?.id,
      status: 'SENT',
      source: 'API',
      whatsappPhoneNumberId: credentials.phoneNumberRecordId,
    },
  });
  
  // Emit webhook event for message.sent (Requirement 3.1, 8.1, 8.2, 8.4)
  webhookService.emitEvent(
    userId,
    'message.sent',
    'whatsapp',
    {
      message_id: message.id,
      customer_id: customer.id,
      customer_phone: customer.phoneNumber,
      direction: 'outbound',
      message_type: data.message_type,
      content: data.content || data.caption || undefined,
      media_url: data.media_url || undefined,
    }
  ).catch(err => logger.error('Failed to emit message.sent webhook:', err));
  
  return c.json({
    success: true,
    data: {
      message_id: message.id,
      customer_id: customer.id,
      customer_created: customerCreated,
      whatsapp_phone_number_id: credentials.phoneNumberRecordId,
      status: 'sent',
      channel: 'whatsapp',
      timestamp: message.createdAt.toISOString(),
    },
  });
}

/**
 * Send message via Instagram
 * Supports multi-account: use instagram_account_id to specify which account to use
 */
async function sendInstagramMessage(
  c: Context,
  userId: string,
  customer: any,
  data: z.infer<typeof sendMessageSchema>
) {
  // Find Instagram conversation for this customer
  // If instagram_account_id is provided, filter by that account
  let igConversation;
  
  if (data.instagram_account_id) {
    // Find conversation for specific Instagram account
    igConversation = customer.igConversations?.find(
      (conv: any) => conv.instagramAccount?.id === data.instagram_account_id
    );
    
    if (!igConversation) {
      // Check if the account exists and belongs to the user
      const accountExists = await prisma.instagramAccount.findFirst({
        where: { id: data.instagram_account_id, userId },
      });
      
      if (!accountExists) {
        return c.json({
          error: {
            code: 'NotFound',
            message: 'Instagram account not found or does not belong to you',
          },
        }, 404);
      }
      
      return c.json({
        error: {
          code: 'ConfigurationError',
          message: 'No conversation found between this customer and the specified Instagram account',
        },
      }, 400);
    }
  } else {
    // Fallback: use first conversation (backward compatible)
    // If customer has multiple IG conversations, recommend specifying account
    if (customer.igConversations?.length > 1) {
      const accountIds = customer.igConversations.map((conv: any) => ({
        instagram_account_id: conv.instagramAccount?.id,
        username: conv.instagramAccount?.username,
      }));
      
      return c.json({
        error: {
          code: 'AmbiguousAccount',
          message: 'Customer has conversations with multiple Instagram accounts. Please specify instagram_account_id.',
          available_accounts: accountIds,
        },
      }, 400);
    }
    
    igConversation = customer.igConversations?.[0];
  }
  
  if (!igConversation || !igConversation.instagramAccount) {
    return c.json({
      error: {
        code: 'ConfigurationError',
        message: 'No Instagram conversation found for this customer',
      },
    }, 400);
  }
  
  const igAccount = igConversation.instagramAccount;
  
  // Verify account ownership
  if (igAccount.userId !== userId) {
    return c.json({
      error: {
        code: 'Forbidden',
        message: 'Instagram account does not belong to authenticated user',
      },
    }, 403);
  }
  
  if (igAccount.connectionStatus !== 'connected') {
    return c.json({
      error: {
        code: 'ConnectionError',
        message: 'Instagram account is disconnected',
        recoveryAction: 'Reconnect your Instagram account',
      },
    }, 403);
  }
  
  // Check 24-hour window for Instagram
  if (!igConversation.isWindowActive) {
    return c.json({
      error: {
        code: 'WindowClosed',
        message: '24-hour messaging window expired. Wait for customer to send a new message.',
        windowStatus: {
          expired: true,
          expiredAt: igConversation.windowExpiresAt,
        },
      },
    }, 400);
  }
  
  let result;
  
  // Send via Instagram API
  switch (data.message_type) {
    case 'text':
      result = await instagramService.sendTextMessage(
        igAccount.igId,
        igConversation.participantIgsid,
        data.content!
      );
      break;
    case 'image':
      result = await instagramService.sendMediaMessage(
        igAccount.igId,
        igConversation.participantIgsid,
        'image',
        data.media_url!
      );
      break;
    case 'media_share':
      // For media_share, we send as image
      result = await instagramService.sendMediaMessage(
        igAccount.igId,
        igConversation.participantIgsid,
        'image',
        data.media_url!
      );
      break;
    default:
      return c.json({
        error: {
          code: 'ValidationError',
          message: `Unsupported message type for Instagram: ${data.message_type}`,
        },
      }, 400);
  }
  
  // Save message to database
  const message = await prisma.iGMessage.create({
    data: {
      conversationId: igConversation.id,
      igMessageId: result.messageId,
      direction: 'OUTBOUND',
      messageType: data.message_type.toUpperCase() as any,
      text: data.content || null,
      mediaUrl: data.media_url || null,
      status: 'SENT',
    },
  });
  
  // Update conversation last message
  await prisma.iGConversation.update({
    where: { id: igConversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: data.content?.substring(0, 100) || '[Media]',
    },
  });
  
  // Emit webhook event for message.sent (Requirement 3.1, 8.1, 8.2, 8.4)
  // Get customer info for webhook payload
  const customerForWebhook = customer.instagramUsername 
    ? { customer_username: customer.instagramUsername }
    : {};
  
  webhookService.emitEvent(
    userId,
    'message.sent',
    'instagram',
    {
      message_id: message.id,
      customer_id: customer.id,
      ...customerForWebhook,
      direction: 'outbound',
      message_type: data.message_type,
      content: data.content || undefined,
      media_url: data.media_url || undefined,
    }
  ).catch(err => logger.error('Failed to emit message.sent webhook:', err));
  
  return c.json({
    success: true,
    data: {
      message_id: message.id,
      status: 'sent',
      channel: 'instagram',
      timestamp: message.createdAt.toISOString(),
    },
  });
}

/**
 * Send message via Facebook Messenger
 * Supports multi-account: use facebook_page_id to specify which page to use
 */
async function sendMessengerMessage(
  c: Context,
  userId: string,
  customer: any,
  data: z.infer<typeof sendMessageSchema>
) {
  // Find Messenger conversation for this customer
  // If facebook_page_id is provided, filter by that page
  let messengerConversation;
  
  if (data.facebook_page_id) {
    // Find conversation for specific Facebook Page
    messengerConversation = customer.messengerConversations?.find(
      (conv: any) => conv.facebookPage?.id === data.facebook_page_id
    );
    
    if (!messengerConversation) {
      // Check if the page exists and belongs to the user
      const pageExists = await prisma.facebookPage.findFirst({
        where: { id: data.facebook_page_id, userId },
      });
      
      if (!pageExists) {
        return c.json({
          error: {
            code: 'NotFound',
            message: 'Facebook Page not found or does not belong to you',
          },
        }, 404);
      }
      
      return c.json({
        error: {
          code: 'ConfigurationError',
          message: 'No conversation found between this customer and the specified Facebook Page',
        },
      }, 400);
    }
  } else {
    // Fallback: use first conversation (backward compatible)
    // If customer has multiple Messenger conversations, recommend specifying page
    if (customer.messengerConversations?.length > 1) {
      const pageIds = customer.messengerConversations.map((conv: any) => ({
        facebook_page_id: conv.facebookPage?.id,
        page_name: conv.facebookPage?.pageName,
      }));
      
      return c.json({
        error: {
          code: 'AmbiguousAccount',
          message: 'Customer has conversations with multiple Facebook Pages. Please specify facebook_page_id.',
          available_pages: pageIds,
        },
      }, 400);
    }
    
    messengerConversation = customer.messengerConversations?.[0];
  }
  
  if (!messengerConversation || !messengerConversation.facebookPage) {
    return c.json({
      error: {
        code: 'ConfigurationError',
        message: 'No Messenger conversation found for this customer',
      },
    }, 400);
  }
  
  const facebookPage = messengerConversation.facebookPage;
  
  // Verify Facebook Page ownership
  if (facebookPage.userId !== userId) {
    return c.json({
      error: {
        code: 'Forbidden',
        message: 'Facebook Page does not belong to authenticated user',
      },
    }, 403);
  }
  
  // Check connection status
  if (facebookPage.connectionStatus !== 'connected') {
    return c.json({
      error: {
        code: 'ConnectionError',
        message: 'Facebook Page is disconnected',
        recoveryAction: 'Reconnect your Facebook Page',
      },
    }, 403);
  }
  
  // Check 24-hour messaging window
  const now = new Date();
  const isWindowActive = messengerConversation.windowExpiresAt
    ? messengerConversation.windowExpiresAt > now
    : messengerConversation.isWindowActive;
  
  if (!isWindowActive) {
    return c.json({
      error: {
        code: 'WindowClosed',
        message: '24-hour messaging window expired. Wait for customer to send a new message.',
        windowStatus: {
          expired: true,
          expiredAt: messengerConversation.windowExpiresAt?.toISOString(),
        },
      },
    }, 400);
  }
  
  let result: { recipient_id: string; message_id: string };
  let savedText: string | undefined;
  let savedMediaUrl: string | undefined;
  let savedMediaType: string | undefined;
  
  // Send message based on type
  try {
    if (data.message_type === 'text') {
      result = await messengerService.sendTextMessage(
        facebookPage.id,
        messengerConversation.participantPsid,
        data.content!
      );
      savedText = data.content;
    } else {
      // Attachment types: image, video, audio, file
      result = await messengerService.sendAttachment(
        facebookPage.id,
        messengerConversation.participantPsid,
        data.message_type as 'image' | 'video' | 'audio' | 'file',
        data.media_url!
      );
      savedMediaUrl = data.media_url;
      savedMediaType = data.message_type;
      savedText = data.caption; // Optional caption
    }
  } catch (sendError) {
    if (sendError instanceof MessengerError) {
      // Save failed message record
      const failedMessage = await prisma.messengerMessage.create({
        data: {
          conversationId: messengerConversation.id,
          direction: 'OUTBOUND',
          messageType: data.message_type.toUpperCase() as any,
          text: data.message_type === 'text' ? data.content : undefined,
          mediaUrl: data.message_type !== 'text' ? data.media_url : undefined,
          mediaType: data.message_type !== 'text' ? data.message_type : undefined,
          status: 'FAILED',
          errorCode: sendError.code,
          errorMessage: sendError.message,
          timestamp: new Date(),
        },
      });
      
      // Emit webhook event for message.failed
      webhookService.emitEvent(
        userId,
        'message.failed',
        'messenger',
        {
          message_id: failedMessage.id,
          customer_id: customer.id,
          direction: 'outbound',
          message_type: data.message_type,
          content: data.content || undefined,
          media_url: data.media_url || undefined,
        }
      ).catch(err => logger.error('Failed to emit message.failed webhook:', err));
      
      return c.json(sendError.toJSON(), sendError.statusCode as any);
    }
    throw sendError;
  }
  
  // Save sent message to database
  const message = await prisma.messengerMessage.create({
    data: {
      conversationId: messengerConversation.id,
      mid: result.message_id,
      direction: 'OUTBOUND',
      messageType: data.message_type.toUpperCase() as any,
      text: savedText,
      mediaUrl: savedMediaUrl,
      mediaType: savedMediaType,
      status: 'SENT',
      timestamp: new Date(),
    },
  });
  
  // Update conversation lastMessageAt
  await prisma.messengerConversation.update({
    where: { id: messengerConversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: savedText?.substring(0, 100) || getMessengerMessagePreview(data.message_type),
    },
  });
  
  // Emit webhook event for message.sent
  webhookService.emitEvent(
    userId,
    'message.sent',
    'messenger',
    {
      message_id: message.id,
      customer_id: customer.id,
      direction: 'outbound',
      message_type: data.message_type,
      content: savedText || undefined,
      media_url: savedMediaUrl || undefined,
    }
  ).catch(err => logger.error('Failed to emit message.sent webhook:', err));
  
  return c.json({
    success: true,
    data: {
      message_id: message.id,
      status: 'sent',
      channel: 'messenger',
      timestamp: message.timestamp.toISOString(),
    },
  });
}

/**
 * Get a preview string for non-text Messenger messages
 */
function getMessengerMessagePreview(messageType: string): string {
  const previews: Record<string, string> = {
    image: '[Image]',
    video: '[Video]',
    audio: '[Audio]',
    file: '[File]',
  };
  return previews[messageType] || '[Message]';
}

/**
 * POST /api/v1/messages/:messageId/read
 * Mark a message as read and send read receipt
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
app.post('/:messageId/read', async (c: Context) => {
  try {
    const userId = getApiKeyUserId(c);
    const messageId = c.req.param('messageId');
    
    if (!messageId) {
      return c.json({
        error: {
          code: 'ValidationError',
          message: 'messageId is required',
        },
      }, 400);
    }
    
    // Try to find message in WhatsApp messages first
    let message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        customer: true,
      },
    });
    
    // If not found, try Instagram messages
    let igMessage = null;
    if (!message) {
      igMessage = await prisma.iGMessage.findUnique({
        where: { id: messageId },
        include: {
          conversation: {
            include: {
              instagramAccount: true,
            },
          },
        },
      });
    }
    
    // Message not found in either table
    if (!message && !igMessage) {
      return c.json({
        error: {
          code: 'NotFound',
          message: 'Message not found',
        },
      }, 404);
    }
    
    // Handle WhatsApp message
    if (message) {
      // Verify ownership
      if (message.userId !== userId) {
        return c.json({
          error: {
            code: 'NotFound',
            message: 'Message not found',
          },
        }, 404);
      }

      // Only mark inbound messages as read
      if (message.direction !== 'INBOUND') {
        return c.json({
          error: {
            code: 'ValidationError',
            message: 'Only inbound messages can be marked as read',
          },
        }, 400);
      }

      // Resolve WhatsApp credentials - prefer message's stored phone number for accuracy
      const readCredentials = await resolveCredentialsForSending(
        userId,
        message.customerId,
        message.whatsappPhoneNumberId || undefined
      );

      if (!readCredentials || !message.wamId) {
        return c.json({
          error: {
            code: 'ConfigurationError',
            message: 'Cannot send read receipt: missing configuration',
          },
        }, 400);
      }

      // Send read receipt via WhatsApp API with per-account token
      const whatsapp = new WhatsAppAPI({ accessToken: readCredentials.accessToken });
      await whatsapp.markAsRead(readCredentials.phoneNumberId, message.wamId);
      
      // Update message status
      const updatedMessage = await prisma.message.update({
        where: { id: messageId },
        data: { status: 'READ' },
      });
      
      return c.json({
        success: true,
        data: {
          message_id: updatedMessage.id,
          status: 'read',
          channel: 'whatsapp',
          updated_at: updatedMessage.createdAt.toISOString(),
        },
      });
    }
    
    // Handle Instagram message
    if (igMessage) {
      const igAccount = igMessage.conversation.instagramAccount;
      
      // Verify ownership
      if (igAccount.userId !== userId) {
        return c.json({
          error: {
            code: 'NotFound',
            message: 'Message not found',
          },
        }, 404);
      }
      
      // Only mark inbound messages as read
      if (igMessage.direction !== 'INBOUND') {
        return c.json({
          error: {
            code: 'ValidationError',
            message: 'Only inbound messages can be marked as read',
          },
        }, 400);
      }
      
      // Send mark_seen to Instagram API (Requirement 4.1)
      let markSeenWarning: string | undefined;
      try {
        await instagramService.sendMarkSeen(
          igAccount.igId,
          igMessage.conversation.participantIgsid
        );
      } catch (error) {
        // Log but don't fail - mark_seen is best effort (Requirement 4.3)
        logger.warn('Failed to send mark_seen to Instagram:', error);
        markSeenWarning = 'Failed to send read receipt to Instagram';
      }
      
      // Update local message status (Requirement 4.2)
      const updatedMessage = await prisma.iGMessage.update({
        where: { id: messageId },
        data: { 
          status: 'READ',
          readAt: new Date(),
        },
      });
      
      // Update conversation unread count
      await prisma.iGConversation.update({
        where: { id: igMessage.conversationId },
        data: {
          unreadCount: {
            decrement: 1,
          },
        },
      });
      
      return c.json({
        success: true,
        data: {
          message_id: updatedMessage.id,
          status: 'read',
          channel: 'instagram',
          updated_at: updatedMessage.createdAt.toISOString(),
          ...(markSeenWarning && { warning: markSeenWarning }),
        },
      });
    }
    
    // Should never reach here
    return c.json({
      error: {
        code: 'InternalError',
        message: 'Unexpected error',
      },
    }, 500);
    
  } catch (error: any) {
    logger.error('Public API mark as read error:', error);
    
    return c.json({
      error: {
        code: 'InternalError',
        message: 'Failed to mark message as read',
      },
    }, 500);
  }
});

export default app;
