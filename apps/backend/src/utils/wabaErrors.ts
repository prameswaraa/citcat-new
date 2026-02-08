/**
 * WABA Error Handling Utilities
 * 
 * Provides structured error handling for WABA signup and operations
 */

/**
 * WABA Error Codes
 */
export enum WABAErrorCode {
  // Signup Flow Errors
  USER_CANCELLED = 'USER_CANCELLED',
  INVALID_CODE = 'INVALID_CODE',
  CODE_EXPIRED = 'CODE_EXPIRED',
  STATE_EXPIRED = 'STATE_EXPIRED',
  STATE_INVALID = 'STATE_INVALID',
  
  // Token Errors
  TOKEN_EXCHANGE_FAILED = 'TOKEN_EXCHANGE_FAILED',
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Permission Errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  MISSING_SCOPES = 'MISSING_SCOPES',
  
  // Webhook Errors
  WEBHOOK_CONFIG_FAILED = 'WEBHOOK_CONFIG_FAILED',
  WEBHOOK_VERIFICATION_FAILED = 'WEBHOOK_VERIFICATION_FAILED',
  
  // Resource Errors
  WABA_NOT_FOUND = 'WABA_NOT_FOUND',
  PHONE_NUMBER_NOT_FOUND = 'PHONE_NUMBER_NOT_FOUND',
  
  // Rate Limit Errors
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  META_API_ERROR = 'META_API_ERROR',
  
  // Generic Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

/**
 * WABA Error with recovery information
 */
export class WABAError extends Error {
  public readonly code: WABAErrorCode
  public readonly statusCode: number
  public readonly retryable: boolean
  public readonly recoveryAction?: string
  public readonly metaError?: {
    code: number
    message: string
    type: string
    subcode?: number
  }

  constructor(
    code: WABAErrorCode,
    message: string,
    options: {
      statusCode?: number
      retryable?: boolean
      recoveryAction?: string
      metaError?: {
        code: number
        message: string
        type: string
        subcode?: number
      }
      cause?: Error
    } = {}
  ) {
    super(message)
    this.name = 'WABAError'
    this.code = code
    this.statusCode = options.statusCode || 500
    this.retryable = options.retryable || false
    this.recoveryAction = options.recoveryAction
    this.metaError = options.metaError

    if (options.cause) {
      this.cause = options.cause
    }

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        recoveryAction: this.recoveryAction,
        metaError: this.metaError,
      },
    }
  }
}

/**
 * Parse Meta API error and create WABAError
 */
export function parseMetaError(error: any): WABAError {
  const metaError = error.response?.data?.error

  if (!metaError) {
    return new WABAError(
      WABAErrorCode.META_API_ERROR,
      error.message || 'Unknown Meta API error',
      {
        statusCode: error.response?.status || 500,
        retryable: error.response?.status >= 500,
        cause: error,
      }
    )
  }

  // Handle specific Meta error codes
  switch (metaError.code) {
    case 190: // Invalid OAuth access token
      if (metaError.error_subcode === 463) {
        // Token expired
        return new WABAError(
          WABAErrorCode.TOKEN_EXPIRED,
          'Access token has expired',
          {
            statusCode: 401,
            retryable: false,
            recoveryAction: 'Please reconnect your WhatsApp Business Account',
            metaError: {
              code: metaError.code,
              message: metaError.message,
              type: metaError.type,
              subcode: metaError.error_subcode,
            },
          }
        )
      } else if (metaError.error_subcode === 467) {
        // Token revoked
        return new WABAError(
          WABAErrorCode.TOKEN_REVOKED,
          'Access token has been revoked',
          {
            statusCode: 401,
            retryable: false,
            recoveryAction: 'Please reconnect your WhatsApp Business Account',
            metaError: {
              code: metaError.code,
              message: metaError.message,
              type: metaError.type,
              subcode: metaError.error_subcode,
            },
          }
        )
      }
      return new WABAError(
        WABAErrorCode.TOKEN_EXCHANGE_FAILED,
        'Invalid access token',
        {
          statusCode: 401,
          retryable: false,
          recoveryAction: 'Please reconnect your WhatsApp Business Account',
          metaError: {
            code: metaError.code,
            message: metaError.message,
            type: metaError.type,
            subcode: metaError.error_subcode,
          },
        }
      )

    case 4: // Rate limit exceeded (app level)
    case 17: // Rate limit exceeded (user level)
    case 32: // Rate limit exceeded (page level)
      return new WABAError(
        WABAErrorCode.RATE_LIMIT_EXCEEDED,
        'Meta API rate limit exceeded. Please try again later.',
        {
          statusCode: 429,
          retryable: true,
          recoveryAction: 'Wait a few minutes and try again',
          metaError: {
            code: metaError.code,
            message: metaError.message,
            type: metaError.type,
          },
        }
      )

    case 100: // Invalid parameter
      if (metaError.message.includes('code')) {
        return new WABAError(
          WABAErrorCode.INVALID_CODE,
          'Invalid or expired authorization code',
          {
            statusCode: 400,
            retryable: true,
            recoveryAction: 'Please try connecting again',
            metaError: {
              code: metaError.code,
              message: metaError.message,
              type: metaError.type,
            },
          }
        )
      }
      return new WABAError(
        WABAErrorCode.VALIDATION_ERROR,
        metaError.message || 'Invalid request parameters',
        {
          statusCode: 400,
          retryable: false,
          metaError: {
            code: metaError.code,
            message: metaError.message,
            type: metaError.type,
          },
        }
      )

    case 200: // Permission error
    case 10: // Permission denied
      return new WABAError(
        WABAErrorCode.INSUFFICIENT_PERMISSIONS,
        'Insufficient permissions. Please grant all required permissions.',
        {
          statusCode: 403,
          retryable: true,
          recoveryAction: 'Reconnect and grant all required permissions: whatsapp_business_management, whatsapp_business_messaging',
          metaError: {
            code: metaError.code,
            message: metaError.message,
            type: metaError.type,
          },
        }
      )

    default:
      return new WABAError(
        WABAErrorCode.META_API_ERROR,
        metaError.message || 'Meta API error occurred',
        {
          statusCode: error.response?.status || 500,
          retryable: error.response?.status >= 500,
          metaError: {
            code: metaError.code,
            message: metaError.message,
            type: metaError.type,
            subcode: metaError.error_subcode,
          },
        }
      )
  }
}

/**
 * Handle user cancellation error
 */
export function createUserCancelledError(reason?: string): WABAError {
  return new WABAError(
    WABAErrorCode.USER_CANCELLED,
    'WhatsApp connection was cancelled',
    {
      statusCode: 400,
      retryable: true,
      recoveryAction: 'Click "Connect WhatsApp" to try again',
    }
  )
}

/**
 * Handle invalid code error
 */
export function createInvalidCodeError(): WABAError {
  return new WABAError(
    WABAErrorCode.INVALID_CODE,
    'Invalid or expired authorization code',
    {
      statusCode: 400,
      retryable: true,
      recoveryAction: 'Please try connecting again',
    }
  )
}

/**
 * Handle state validation error
 */
export function createStateValidationError(reason: string): WABAError {
  return new WABAError(
    WABAErrorCode.STATE_INVALID,
    `State validation failed: ${reason}`,
    {
      statusCode: 400,
      retryable: true,
      recoveryAction: 'Please try connecting again',
    }
  )
}

/**
 * Handle webhook configuration error
 */
export function createWebhookConfigError(error: Error): WABAError {
  return new WABAError(
    WABAErrorCode.WEBHOOK_CONFIG_FAILED,
    'Failed to configure webhooks. Connection is partial.',
    {
      statusCode: 500,
      retryable: true,
      recoveryAction: 'Webhooks can be configured later from settings',
      cause: error,
    }
  )
}

/**
 * Handle token refresh error
 */
export function createTokenRefreshError(error: any): WABAError {
  if (error instanceof WABAError) {
    return error
  }

  return new WABAError(
    WABAErrorCode.TOKEN_REFRESH_FAILED,
    'Failed to refresh access token',
    {
      statusCode: 500,
      retryable: true,
      recoveryAction: 'Try refreshing again or reconnect your WhatsApp account',
      cause: error,
    }
  )
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: any): boolean {
  if (error instanceof WABAError) {
    return error.retryable
  }

  // Network errors are retryable
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    return true
  }

  // 5xx errors are retryable
  if (error.response?.status >= 500) {
    return true
  }

  // Rate limit errors are retryable
  if (error.response?.status === 429) {
    return true
  }

  return false
}

/**
 * Get retry delay based on attempt number (exponential backoff)
 */
export function getRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000) // Max 30 seconds
}
