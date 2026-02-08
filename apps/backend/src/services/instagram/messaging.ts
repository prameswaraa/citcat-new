/**
 * Instagram Messaging Module
 * 
 * Contains messaging and sender action functions for Instagram DM.
 * Extracted from InstagramService.ts for better modularity.
 */

import axios, { AxiosInstance } from 'axios';
import {
  SendMessageResponse,
  SenderActionResponse,
  SenderAction,
  MediaType,
  MEDIA_SIZE_LIMITS,
  TEXT_MESSAGE_MAX_BYTES,
} from './types.js';
import { IGErrorCode, InstagramError } from './errors.js';

// ============================================================================
// Dependencies Interface
// ============================================================================

export interface MessagingDependencies {
  client: AxiosInstance;
  getDecryptedTokenByIgId: (igId: string) => Promise<string>;
}

// ============================================================================
// Messaging Functions
// ============================================================================

/**
 * Send a text message to an Instagram user
 * Text must be max 1000 bytes UTF-8
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID (sender)
 * @param recipientId - IGSID of the recipient
 * @param text - Message text (max 1000 bytes)
 * @returns Send message response with message ID
 */
export async function sendTextMessage(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string,
  text: string
): Promise<SendMessageResponse> {
  // Validate text length (max 1000 bytes UTF-8)
  const textBytes = Buffer.byteLength(text, 'utf8');
  if (textBytes > TEXT_MESSAGE_MAX_BYTES) {
    throw new InstagramError(
      IGErrorCode.MESSAGE_TOO_LONG,
      `Message exceeds maximum length of ${TEXT_MESSAGE_MAX_BYTES} bytes (got ${textBytes} bytes)`,
      400,
      false
    );
  }

  try {
    const accessToken = await deps.getDecryptedTokenByIgId(igId);

    const response = await deps.client.post(
      `https://graph.instagram.com/${igId}/messages`,
      {
        recipient: { id: recipientId },
        message: { text },
      },
      {
        params: { access_token: accessToken },
      }
    );

    return {
      recipientId: response.data.recipient_id,
      messageId: response.data.message_id,
    };
  } catch (error) {
    return handleSendMessageError(error);
  }
}

/**
 * Send a media message (image, video, or audio)
 * Validates media size limits before sending
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID (sender)
 * @param recipientId - IGSID of the recipient
 * @param mediaType - Type of media (image, video, audio)
 * @param mediaUrl - URL of the media file
 * @returns Send message response with message ID
 */
export async function sendMediaMessage(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string,
  mediaType: MediaType,
  mediaUrl: string
): Promise<SendMessageResponse> {
  // Note: We can't validate actual file size from URL here
  // The Instagram API will reject if the file is too large

  try {
    const accessToken = await deps.getDecryptedTokenByIgId(igId);

    const response = await deps.client.post(
      `https://graph.instagram.com/${igId}/messages`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: mediaType,
            payload: {
              url: mediaUrl,
            },
          },
        },
      },
      {
        params: { access_token: accessToken },
      }
    );

    return {
      recipientId: response.data.recipient_id,
      messageId: response.data.message_id,
    };
  } catch (error) {
    return handleSendMessageError(error);
  }
}

/**
 * Send a heart sticker (like_heart)
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID (sender)
 * @param recipientId - IGSID of the recipient
 * @returns Send message response with message ID
 */
export async function sendHeartSticker(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string
): Promise<SendMessageResponse> {
  try {
    const accessToken = await deps.getDecryptedTokenByIgId(igId);

    const response = await deps.client.post(
      `https://graph.instagram.com/${igId}/messages`,
      {
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: 'like_heart',
          },
        },
      },
      {
        params: { access_token: accessToken },
      }
    );

    return {
      recipientId: response.data.recipient_id,
      messageId: response.data.message_id,
    };
  } catch (error) {
    return handleSendMessageError(error);
  }
}

/**
 * React to a message with 'love' reaction
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID
 * @param recipientId - IGSID of the conversation participant
 * @param messageId - ID of the message to react to
 * @returns Send message response
 */
export async function sendReaction(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string,
  messageId: string
): Promise<SendMessageResponse> {
  try {
    const accessToken = await deps.getDecryptedTokenByIgId(igId);

    const response = await deps.client.post(
      `https://graph.instagram.com/${igId}/messages`,
      {
        recipient: { id: recipientId },
        sender_action: 'react',
        payload: {
          message_id: messageId,
          reaction: 'love',
        },
      },
      {
        params: { access_token: accessToken },
      }
    );

    return {
      recipientId: response.data.recipient_id,
      messageId: response.data.message_id,
    };
  } catch (error) {
    return handleSendMessageError(error);
  }
}

/**
 * Validate media size before upload
 * 
 * @param mediaType - Type of media
 * @param sizeInBytes - Size of the media file in bytes
 * @throws InstagramError if media exceeds size limit
 */
export function validateMediaSize(mediaType: MediaType, sizeInBytes: number): void {
  const limit = MEDIA_SIZE_LIMITS[mediaType];
  if (sizeInBytes > limit) {
    const limitMB = limit / (1024 * 1024);
    const sizeMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    throw new InstagramError(
      IGErrorCode.MEDIA_TOO_LARGE,
      `${mediaType} file size (${sizeMB}MB) exceeds maximum limit of ${limitMB}MB`,
      400,
      false
    );
  }
}

// ============================================================================
// Sender Action Functions
// ============================================================================

/**
 * Send a sender action to an Instagram user
 * Sender actions include typing indicators and mark_seen
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID
 * @param recipientId - IGSID of the recipient
 * @param action - Sender action type ('typing_on', 'typing_off', 'mark_seen')
 * @returns SenderActionResponse with recipient ID
 */
export async function sendSenderAction(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string,
  action: SenderAction
): Promise<SenderActionResponse> {
  try {
    const accessToken = await deps.getDecryptedTokenByIgId(igId);

    const response = await deps.client.post(
      `https://graph.instagram.com/${igId}/messages`,
      {
        recipient: { id: recipientId },
        sender_action: action,
      },
      {
        params: { access_token: accessToken },
      }
    );

    return {
      recipientId: response.data.recipient_id,
    };
  } catch (error) {
    if (error instanceof InstagramError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      const metaError = error.response?.data?.error;

      // Handle specific error codes
      if (metaError?.code === 10) {
        throw new InstagramError(
          IGErrorCode.MESSAGING_WINDOW_CLOSED,
          'Cannot send sender action: 24-hour messaging window has expired',
          400,
          false,
          'Wait for the user to send a new message to reopen the window'
        );
      }

      if (metaError?.code === 200) {
        throw new InstagramError(
          IGErrorCode.USER_BLOCKED,
          'Cannot send sender action: User has blocked this account',
          403,
          false
        );
      }

      if ([4, 17, 32].includes(metaError?.code)) {
        throw new InstagramError(
          IGErrorCode.RATE_LIMIT,
          'Rate limit exceeded. Please try again later.',
          429,
          true,
          'Wait a few minutes and try again'
        );
      }

      throw new InstagramError(
        IGErrorCode.SENDER_ACTION_FAILED,
        `Failed to send ${action}: ${metaError?.message || error.message}`,
        error.response?.status || 500,
        error.response?.status ? error.response.status >= 500 : false,
        undefined,
        metaError ? {
          code: metaError.code,
          message: metaError.message,
          type: metaError.type,
          subcode: metaError.error_subcode,
        } : undefined
      );
    }

    throw new InstagramError(
      IGErrorCode.SENDER_ACTION_FAILED,
      `Failed to send ${action}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500,
      false
    );
  }
}

/**
 * Send typing indicator (typing_on) to an Instagram user
 * Convenience method for sendSenderAction
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID
 * @param recipientId - IGSID of the recipient
 * @returns SenderActionResponse with recipient ID
 */
export async function sendTypingOn(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string
): Promise<SenderActionResponse> {
  return sendSenderAction(deps, igId, recipientId, 'typing_on');
}

/**
 * Send typing off indicator to an Instagram user
 * Convenience method for sendSenderAction
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID
 * @param recipientId - IGSID of the recipient
 * @returns SenderActionResponse with recipient ID
 */
export async function sendTypingOff(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string
): Promise<SenderActionResponse> {
  return sendSenderAction(deps, igId, recipientId, 'typing_off');
}

/**
 * Send mark_seen indicator to an Instagram user
 * Convenience method for sendSenderAction
 * 
 * @param deps - Messaging dependencies
 * @param igId - Instagram Professional Account ID
 * @param recipientId - IGSID of the recipient
 * @returns SenderActionResponse with recipient ID
 */
export async function sendMarkSeen(
  deps: MessagingDependencies,
  igId: string,
  recipientId: string
): Promise<SenderActionResponse> {
  return sendSenderAction(deps, igId, recipientId, 'mark_seen');
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Handle send message errors with proper error mapping
 */
function handleSendMessageError(error: unknown): never {
  if (error instanceof InstagramError) {
    throw error;
  }

  if (axios.isAxiosError(error)) {
    const metaError = error.response?.data?.error;

    // Messaging window closed (code 10)
    if (metaError?.code === 10) {
      throw new InstagramError(
        IGErrorCode.MESSAGING_WINDOW_CLOSED,
        'Cannot send message: 24-hour messaging window has expired',
        400,
        false,
        'Wait for the user to send a new message to reopen the window'
      );
    }

    // User blocked (code 200)
    if (metaError?.code === 200) {
      throw new InstagramError(
        IGErrorCode.USER_BLOCKED,
        'Cannot send message: User has blocked this account',
        403,
        false
      );
    }

    // Rate limit (code 4, 17, 32)
    if ([4, 17, 32].includes(metaError?.code)) {
      throw new InstagramError(
        IGErrorCode.RATE_LIMIT,
        'Rate limit exceeded. Please try again later.',
        429,
        true,
        'Wait a few minutes and try again'
      );
    }

    // Permission denied
    if (metaError?.code === 200 || metaError?.code === 10) {
      throw new InstagramError(
        IGErrorCode.PERMISSION_DENIED,
        `Permission denied: ${metaError?.message || 'Unknown error'}`,
        403,
        false
      );
    }

    throw new InstagramError(
      IGErrorCode.INTERNAL_ERROR,
      `Failed to send message: ${metaError?.message || error.message}`,
      error.response?.status || 500,
      error.response?.status ? error.response.status >= 500 : false,
      undefined,
      metaError ? {
        code: metaError.code,
        message: metaError.message,
        type: metaError.type,
        subcode: metaError.error_subcode,
      } : undefined
    );
  }

  throw new InstagramError(
    IGErrorCode.INTERNAL_ERROR,
    `Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`,
    500,
    false
  );
}
