/**
 * WABA Error Handling Module
 *
 * Contains error codes and custom error class for WABA API operations.
 * Provides structured error handling for OAuth, token management, webhooks, and coexistence.
 */

// ============================================================================
// WABA Error Codes
// ============================================================================

export enum WABAErrorCode {
  // OAuth Errors
  INVALID_STATE = 'INVALID_STATE',
  STATE_EXPIRED = 'STATE_EXPIRED',
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',

  // Token Errors
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  TOKEN_NOT_FOUND = 'TOKEN_NOT_FOUND',

  // Resource Discovery Errors
  RESOURCE_DISCOVERY_FAILED = 'RESOURCE_DISCOVERY_FAILED',
  NO_WABA_FOUND = 'NO_WABA_FOUND',
  NO_PHONE_NUMBERS = 'NO_PHONE_NUMBERS',

  // Webhook Errors
  WEBHOOK_CONFIG_FAILED = 'WEBHOOK_CONFIG_FAILED',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  WEBHOOK_URL_NOT_CONFIGURED = 'WEBHOOK_URL_NOT_CONFIGURED',

  // Settings Errors
  SETTINGS_NOT_CONFIGURED = 'SETTINGS_NOT_CONFIGURED',
  MISSING_APP_CREDENTIALS = 'MISSING_APP_CREDENTIALS',

  // Coexistence Errors
  COEXISTENCE_ERROR = 'COEXISTENCE_ERROR',
  SYNC_FAILED = 'SYNC_FAILED',

  // Rate Limiting
  RATE_LIMIT = 'RATE_LIMIT',

  // Generic Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
}

// ============================================================================
// WABA Service Error Class
// ============================================================================

export class WABAServiceError extends Error {
  constructor(
    public code: WABAErrorCode,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'WABAServiceError';
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Check if error is retryable
   */
  get retryable(): boolean {
    return [
      WABAErrorCode.RATE_LIMIT,
      WABAErrorCode.NETWORK_ERROR,
      WABAErrorCode.INTERNAL_ERROR,
    ].includes(this.code);
  }

  /**
   * Get HTTP status code for this error
   */
  get statusCode(): number {
    switch (this.code) {
      case WABAErrorCode.INVALID_STATE:
      case WABAErrorCode.STATE_EXPIRED:
      case WABAErrorCode.INVALID_SIGNATURE:
        return 400;
      case WABAErrorCode.TOKEN_EXPIRED:
      case WABAErrorCode.TOKEN_REVOKED:
      case WABAErrorCode.TOKEN_NOT_FOUND:
        return 401;
      case WABAErrorCode.SETTINGS_NOT_CONFIGURED:
      case WABAErrorCode.MISSING_APP_CREDENTIALS:
        return 503;
      case WABAErrorCode.RATE_LIMIT:
        return 429;
      case WABAErrorCode.USER_NOT_FOUND:
      case WABAErrorCode.NO_WABA_FOUND:
        return 404;
      default:
        return 500;
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        details: this.details,
      },
    };
  }
}
