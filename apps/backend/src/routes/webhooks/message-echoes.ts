/**
 * Coexistence Message Echoes Webhook Handler
 * Handles messages sent via WhatsApp Business App (smb_message_echoes)
 * Mirrors these messages in the platform for unified message history
 */

import { prisma } from '../../utils/database.js'
import type { MessageType, MessageDirection, MessageStatus, MessageSource } from '@prisma/client'

interface MessageEchoPayload {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  message_echoes: Array<{
    from: string
    to: string
    id: string
    timestamp: string
    type: string
    [key: string]: any // Message content based on type
  }>
}

/**
 * Handle message echoes webhook (smb_message_echoes)
 * Processes messages sent by business via WhatsApp Business App
 */
export async function handleMessageEchoes(
  payload: MessageEchoPayload,
  user: any
): Promise<void> {
  try {
    if (!user) {
      console.warn('⚠️ Message echoes webhook received but user not found')
      return
    }

    console.log(`💬 Processing message echoes for user ${user.id}`)

    for (const echoMessage of payload.message_echoes) {
      try {
        // Skip if message already exists
        const existing = await prisma.message.findFirst({
          where: { wamId: echoMessage.id }
        })
        if (existing) {
          console.log(`⏭️ Message ${echoMessage.id} already exists, skipping`)
          continue
        }

        // Get or create customer
        const customerPhoneNumber = echoMessage.to
        let customer = await prisma.customer.findFirst({
          where: {
            userId: user.id,
            phoneNumber: customerPhoneNumber
          }
        })

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              userId: user.id,
              phoneNumber: customerPhoneNumber,
              consentStatus: false
            }
          })
          console.log(`📞 Created customer: ${customerPhoneNumber}`)
        }

        // Map message type
        const messageType = mapMessageType(echoMessage.type)

        // Extract message content
        const content = extractMessageContent(echoMessage)

        // Extract media URL if present
        const mediaUrl = extractMediaUrl(echoMessage)

        // Create message record with source = WHATSAPP_APP
        const message = await prisma.message.create({
          data: {
            userId: user.id,
            customerId: customer.id,
            wamId: echoMessage.id,
            messageType,
            direction: 'OUTBOUND', // Business always sends outbound
            content,
            mediaUrl,
            status: 'SENT', // Initial status
            source: 'WHATSAPP_APP',
            deviceTimestamp: new Date(parseInt(echoMessage.timestamp) * 1000),
            timestamp: new Date(parseInt(echoMessage.timestamp) * 1000),
            isHistoryMessage: false
          }
        })

        console.log(`✅ Mirrored WhatsApp Business App message ${message.id} (wamId: ${echoMessage.id})`)
      } catch (msgError) {
        console.error(`❌ Failed to process message echo ${echoMessage.id}:`, msgError)
      }
    }

    console.log(`✅ Message echoes processed for user ${user.id}`)
  } catch (error) {
    console.error('❌ Message echoes webhook error:', error)
    throw error
  }
}

/**
 * Map WhatsApp message type to Prisma MessageType enum
 */
function mapMessageType(type: string): MessageType {
  const typeMap: Record<string, MessageType> = {
    text: 'TEXT',
    image: 'IMAGE',
    audio: 'AUDIO',
    video: 'VIDEO',
    document: 'DOCUMENT',
    sticker: 'STICKER',
    contacts: 'CONTACTS',
    location: 'LOCATION',
    template: 'TEMPLATE',
    button: 'BUTTONS',
    list: 'LIST'
  }
  return typeMap[type] || 'TEXT'
}

/**
 * Extract message content based on message type
 */
function extractMessageContent(message: any): string | null {
  if (message.text?.body) {
    return message.text.body
  }
  if (message.image?.caption) {
    return message.image.caption
  }
  if (message.video?.caption) {
    return message.video.caption
  }
  if (message.document?.caption) {
    return message.document.caption
  }
  if (message.document?.filename) {
    return `[Document: ${message.document.filename}]`
  }
  if (message.contacts) {
    return '[Contact]'
  }
  if (message.location) {
    return '[Location]'
  }
  return null
}

/**
 * Extract media URL from message
 */
function extractMediaUrl(message: any): string | null {
  if (message.image?.link || message.image?.id) {
    return message.image.link || message.image.id
  }
  if (message.video?.link || message.video?.id) {
    return message.video.link || message.video.id
  }
  if (message.audio?.link || message.audio?.id) {
    return message.audio.link || message.audio.id
  }
  if (message.document?.link || message.document?.id) {
    return message.document.link || message.document.id
  }
  return null
}
