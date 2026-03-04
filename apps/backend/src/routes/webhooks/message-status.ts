import { prisma } from '../../utils/database.js'
import { webhookService, WebhookEventType } from '../../services/webhook-service.js'
import { eventEmitter } from '../../websocket/event-emitter.js'
import { auditLog } from '../../utils/auditLog.js'
import { getWhatsAppErrorMessage } from '../../services/error-messages/index.js'
import type { MessageStatus } from '@prisma/client'

/**
 * Get human-readable error message for Meta error code
 * Uses centralized error-messages service with Indonesian locale for internal webhooks
 */
function getReadableErrorMessage(errorCode: number, fallbackMessage: string): string {
  const errorMsg = getWhatsAppErrorMessage(errorCode, 'id')
  return errorMsg?.message || fallbackMessage
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
        whatsappPhoneNumberId: true,
        whatsappPhoneNumber: {
          select: {
            id: true,
            displayPhoneNumber: true,
          }
        },
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
    if (message?.bulkSendJobId) {
      const statusLower = status.status.toLowerCase()
      const previousStatus = message.status

      // Handle failed status - only update when message was previously PENDING
      if (statusLower === 'failed' && previousStatus === 'PENDING') {
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

      // Increment delivery tracking counters based on status
      // WhatsApp may skip statuses (e.g., PENDING → READ directly), so we need to increment all skipped counters
      // Status progression: PENDING → SENT → DELIVERED → READ
      const statusProgression = ['PENDING', 'SENT', 'DELIVERED', 'READ']
      const previousIndex = statusProgression.indexOf(previousStatus)
      const newIndex = statusProgression.indexOf(statusLower.toUpperCase())

      // Only process if this is a forward progression (not failed, not going backward)
      if (newIndex > previousIndex && newIndex > 0) {
        const incrementData: Record<string, { increment: number }> = {}
        const incrementedCounters: string[] = []

        // Increment all counters from previousIndex+1 to newIndex (inclusive)
        for (let i = previousIndex + 1; i <= newIndex; i++) {
          if (i === 1) {
            incrementData.sentCount = { increment: 1 }
            incrementedCounters.push('sentCount')
          } else if (i === 2) {
            incrementData.deliveredCount = { increment: 1 }
            incrementedCounters.push('deliveredCount')
          } else if (i === 3) {
            incrementData.readCount = { increment: 1 }
            incrementedCounters.push('readCount')
          }
        }

        if (Object.keys(incrementData).length > 0) {
          await prisma.bulkTemplateSend.update({
            where: { id: message.bulkSendJobId },
            data: incrementData,
          })
          console.log(`📊 Updated broadcast job ${message.bulkSendJobId}: ${incrementedCounters.join(', ')}++`)
        }
      }
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
        // Include raw status object for status events
        // Contains: id, status, timestamp, recipient_id, errors (if failed)
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
            phone_number_id: message.whatsappPhoneNumber?.id,
            business_phone: message.whatsappPhoneNumber?.displayPhoneNumber,
          },
          status // Pass raw WhatsApp status object
        ).catch(err => console.error(`Failed to emit ${eventType} webhook:`, err))
      }
    }
  } catch (error) {
    console.error('❌ Error handling message status:', error)
    throw error
  }
}
