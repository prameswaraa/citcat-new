/**
 * Instagram Error Handling Module
 * 
 * Contains error codes and custom error class for Instagram API operations.
 * Extracted from InstagramService.ts for better modularity.
 */

// ============================================================================
// Instagram Error Codes
// ============================================================================

export enum IGErrorCode {
  // OAuth Errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_CODE = 'INVALID_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  STATE_EXPIRED = 'STATE_EXPIRED',
  STATE_INVALID = 'STATE_INVALID',

  // Token Errors
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Messaging Errors
  MESSAGING_WINDOW_CLOSED = 'MESSAGING_WINDOW_CLOSED',
  USER_BLOCKED = 'USER_BLOCKED',
  RATE_LIMIT = 'RATE_LIMIT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',

  // Feature Errors
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',

  // Sender Action Errors
  SENDER_ACTION_FAILED = 'SENDER_ACTION_FAILED',

  // Generic Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

// ============================================================================
// Instagram Error Class
// ============================================================================

export class InstagramError extends Error {
  constructor(
    public code: IGErrorCode,
    message: string,
    public statusCode: number = 500,
    public retryable: boolean = false,
    public recoveryAction?: string,
    public metaError?: {
      code: number;
      message: string;
      type: string;
      subcode?: number;
    }
  ) {
    super(message);
    this.name = 'InstagramError';
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        recoveryAction: this.recoveryAction,
        metaError: this.metaError,
      },
    };
  }
}
