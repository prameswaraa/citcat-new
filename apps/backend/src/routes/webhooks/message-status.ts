import { prisma } from '../../utils/database.js'
import { webhookService, WebhookEventType } from '../../services/webhook-service.js'
import { eventEmitter } from '../../websocket/event-emitter.js'
import { auditLog } from '../../utils/auditLog.js'
import type { MessageStatus } from '@prisma/client'

/**
 * Human-readable error messages for common Meta/WhatsApp error codes
 */
const META_ERROR_MESSAGES: Record<number, string> = {
  // Payment & Business Eligibility
  131042: 'Pembayaran Meta belum diselesaikan. Silakan cek metode pembayaran di Meta Business Settings.',
  131043: 'Akun bisnis belum diverifikasi. Silakan verifikasi bisnis di Meta Business Manager.',

  // Message Delivery
  131026: 'Pesan tidak dapat dikirim. Nomor tidak valid atau diblokir.',
  131047: 'Window 24 jam telah berakhir. Gunakan template message untuk menghubungi customer.',
  131051: 'Pesan tidak dikirim karena kebijakan Meta.',
  131052: 'Media tidak dapat diunduh dari URL yang diberikan.',
  131053: 'Gagal mengunduh media. Pastikan URL valid dan dapat diakses.',

  // Template Errors
  131008: 'Parameter template tidak lengkap. Periksa variabel yang dibutuhkan.',
  132000: 'Template sedang dijeda atau dinonaktifkan.',
  132001: 'Jumlah parameter tidak sesuai dengan template.',
  132005: 'Template tidak ditemukan. Pastikan template sudah diapprove.',
  132007: 'Template tidak diizinkan untuk kategori ini.',
  132012: 'Template belum diapprove oleh Meta.',
  132015: 'Template ditolak. Periksa konten template di WhatsApp Manager.',

  // Rate Limiting
  130429: 'Terlalu banyak request. Coba lagi dalam beberapa menit.',
  131048: 'Batas pengiriman tercapai. Coba lagi besok.',
  131056: 'Batas pengiriman per jam tercapai.',

  // Media Errors
  131009: 'Media ID tidak valid atau sudah kedaluwarsa.',
  131016: 'File media terlalu besar.',

  // Account Issues
  131031: 'Akun bisnis WhatsApp bermasalah. Hubungi support Meta.',
  131045: 'Akun tidak eligible untuk mengirim pesan.',
  131049: 'Nomor telepon tidak terdaftar di WhatsApp.',
}

/**
 * Get human-readable error message for Meta error code
 */
function getReadableErrorMessage(errorCode: number, fallbackMessage: string): string {
  return META_ERROR_MESSAGES[errorCode] || fallbackMessage
}

export async function handleMessageStatus(
  status: any,
  user: any
): Promise<void> {
  try {
    if (!user) {
      console.error('❌ User not found for status update')
      return
    }

    console.log('📊 Processing message status:', {
      messageId: status.id,
      status: status.status,
      userId: user.id,
      ...(status.errors && { errors: status.errors })
    })

    // Log detailed error info when message fails
    if (status.status === 'failed' && status.errors) {
      console.error('❌ Message failed with errors:', JSON.stringify(status.errors, null, 2))
    }

    // Find the message first to get customer info for webhook and broadcast job tracking
    const message = await prisma.message.findFirst({
      where: {
        wamId: status.id,
        userId: user.id
      },
      select: {
        id: true,
        customerId: true,
        direction: true,
        messageType: true,
        content: true,
        mediaUrl: true,
        status: true,
        bulkSendJobId: true,
        customer: {
          select: {
            id: true,
            phoneNumber: true,
          }
        }
      }
    })

    // Build update data
    const updateData: {
      status: MessageStatus;
      timestamp: Date;
      errorCode?: string;
      errorMessage?: string;
    } = {
      status: status.status.toUpperCase() as MessageStatus,
      timestamp: new Date(parseInt(status.timestamp) * 1000)
    }

    // Error details for failed messages
    let errorCode: string | undefined
    let errorMessage: string | undefined

    // Add error details if message failed
    if (status.status === 'failed' && status.errors && status.errors.length > 0) {
      const firstError = status.errors[0]
      errorCode = String(firstError.code || '')
      // Get human-readable error message
      errorMessage = getReadableErrorMessage(
        firstError.code,
        firstError.title || firstError.message || 'Pesan gagal dikirim'
      )
      updateData.errorCode = errorCode
      updateData.errorMessage = errorMessage
    }

    // Update message status
    await prisma.message.updateMany({
      where: {
        wamId: status.id,
        userId: user.id
      },
      data: updateData
    })

    console.log('✅ Message status updated:', status.id, '→', status.status)

    // Audit log for message status updates
    if (message) {
      const statusLower = status.status.toLowerCase()
      const actionMap: Record<string, string> = {
        delivered: 'MESSAGE_DELIVERED',
        read: 'MESSAGE_READ',
        failed: 'MESSAGE_FAILED',
        sent: 'MESSAGE_SENT',
      }
      const auditAction = actionMap[statusLower] || 'WEBHOOK_STATUS_UPDATE'
      await auditLog(
        auditAction,
        'Message',
        message.id,
        {
          wamId: status.id,
          status: status.status,
          customerId: message.customerId,
          ...(errorCode && { errorCode }),
          ...(errorMessage && { errorMessage })
        },
        user.id
      )
    }

    // Update broadcast job statistics if this message is part of a bulk send
    // Only update when message was previously PENDING (not yet confirmed)
    if (message?.bulkSendJobId && message.status === 'PENDING') {
      const statusLower = status.status.toLowerCase()

      if (statusLower === 'failed') {
        // Message failed - decrement successCount (was counted at API call time) and increment failedCount
        await prisma.bulkTemplateSend.update({
          where: { id: message.bulkSendJobId },
          data: {
            successCount: { decrement: 1 },
            failedCount: { increment: 1 },
          },
        })
        console.log(`📊 Updated broadcast job ${message.bulkSendJobId}: successCount--, failedCount++`)
      }
      // For 'sent' or 'delivered' status, no need to update counts as it was already counted as success
    }

    // Emit real-time event to user's OneInbox via WebSocket
    if (message) {
      eventEmitter.emitMessageStatus(user.id, {
        messageId: message.id,
        conversationId: message.customerId, // conversationId is the customerId for WA
        status: status.status.toLowerCase() as 'sent' | 'delivered' | 'read' | 'failed',
        ...(errorCode && { errorCode }),
        ...(errorMessage && { errorMessage })
      })
      console.log(`[EventEmitter] Emitted message_status to user ${user.id}`)
    }

    // Emit webhook event for status updates (Requirement 3.1, 8.1, 8.2, 8.4)
    if (message && message.customer) {
      const statusLower = status.status.toLowerCase()
      let eventType: WebhookEventType | null = null

      if (statusLower === 'delivered') {
        eventType = 'message.delivered'
      } else if (statusLower === 'read') {
        eventType = 'message.read'
      } else if (statusLower === 'failed') {
        eventType = 'message.failed'
      }

      if (eventType) {
        webhookService.emitEvent(
          user.id,
          eventType,
          'whatsapp',
          {
            message_id: message.id,
            customer_id: message.customer.id,
            customer_phone: message.customer.phoneNumber,
            direction: message.direction.toLowerCase() as 'inbound' | 'outbound',
            message_type: message.messageType.toLowerCase(),
            content: message.content || undefined,
            media_url: message.mediaUrl || undefined,
          }
        ).catch(err => console.error(`Failed to emit ${eventType} webhook:`, err))
      }
    }
  } catch (error) {
    console.error('❌ Error handling message status:', error)
    throw error
  }
}
