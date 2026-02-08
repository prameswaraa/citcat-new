// ============================================================================
// Instagram Service Types and Interfaces
// ============================================================================

// OAuth Response Types
export interface AuthUrlResponse {
  authUrl: string;
  state: string;
  expiresAt: string;
}

export interface TokenResponse {
  accessToken: string;
  userId: string; // Instagram-scoped user ID (IGSID)
  permissions?: string[];
}

export interface LongLivedTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number; // seconds (typically 5184000 = 60 days)
}

// Profile Types
export interface IGAccountProfile {
  id: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
  accountType?: string;
}

export interface IGUserProfile {
  id: string;
  name?: string;
  username?: string;
  profilePic?: string;
  followerCount?: number;
  isUserFollowBusiness?: boolean;
  isBusinessFollowUser?: boolean;
}

// Messaging Types
export interface SendMessageResponse {
  recipientId: string;
  messageId: string;
}

export interface SenderActionResponse {
  recipientId: string;
}

export type SenderAction = 'typing_on' | 'typing_off' | 'mark_seen';

export type MediaType = 'image' | 'video' | 'audio';

// Webhook Event Types
export interface IGWebhookEvent {
  object: 'instagram';
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<IGMessagingEvent>;
  }>;
}

export interface IGMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: IGMessagePayload;
  reaction?: IGReactionPayload;
  read?: IGReadPayload;
  postback?: IGPostbackPayload;
  referral?: IGReferralPayload;
}

export interface IGMessagePayload {
  mid: string;
  text?: string;
  attachments?: Array<{
    type: string;
    payload: {
      url?: string;
      sticker_id?: number;
    };
  }>;
  reply_to?: {
    mid?: string;
    story?: {
      id: string;
      url: string;
    };
  };
  referral?: {
    ref?: string;
    source?: string;
    type?: string;
  };
  is_echo?: boolean;
  is_deleted?: boolean;
}

export interface IGReactionPayload {
  mid: string;
  action: 'react' | 'unreact';
  reaction?: string;
  emoji?: string;
}

export interface IGReadPayload {
  watermark: number;
}

export interface IGPostbackPayload {
  mid: string;
  title: string;
  payload: string;
}

export interface IGReferralPayload {
  ref?: string;
  source?: string;
  type?: string;
}

// ============================================================================
// Constants
// ============================================================================

// Media size limits (in bytes)
export const MEDIA_SIZE_LIMITS = {
  image: 8 * 1024 * 1024,    // 8MB
  video: 25 * 1024 * 1024,   // 25MB
  audio: 25 * 1024 * 1024,   // 25MB
};

// Text message limit (in bytes)
export const TEXT_MESSAGE_MAX_BYTES = 1000;
