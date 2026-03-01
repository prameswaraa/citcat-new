/**
 * WhatsApp Error Messages Service
 * Centralized service for handling WhatsApp error messages with i18n support
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ==========================================
// Types
// ==========================================

export type Locale = 'en' | 'id';

export interface WhatsAppErrorMessage {
  error_code: string;
  message: string;
  recovery_action: string;
  category: string;
  retryable: boolean;
  http_status: 400 | 401 | 403 | 404 | 429 | 500 | 503;
}

interface LocaleErrorData {
  message: string;
  recovery_action: string;
  category: string;
}

// ==========================================
// Error Metadata (non-translatable)
// ==========================================

/**
 * Static error metadata that doesn't change with locale
 * Maps error code to { error_code, retryable, http_status }
 */
const ERROR_METADATA: Record<string, { error_code: string; retryable: boolean; http_status: 400 | 401 | 403 | 404 | 429 | 500 | 503 }> = {
  '131026': { error_code: 'RecipientNotOnWhatsApp', retryable: false, http_status: 400 },
  '131047': { error_code: 'WindowExpired', retryable: false, http_status: 400 },
  '130429': { error_code: 'RateLimitHit', retryable: true, http_status: 429 },
  '131048': { error_code: 'SpamRateLimitHit', retryable: false, http_status: 429 },
  '131056': { error_code: 'PairRateLimitHit', retryable: true, http_status: 429 },
  '131050': { error_code: 'UserOptedOut', retryable: false, http_status: 400 },
  '132001': { error_code: 'TemplateNotFound', retryable: false, http_status: 404 },
  '132000': { error_code: 'TemplateParamMismatch', retryable: false, http_status: 400 },
  '132015': { error_code: 'TemplatePaused', retryable: false, http_status: 400 },
  '132016': { error_code: 'TemplateDisabled', retryable: false, http_status: 400 },
  '132005': { error_code: 'TemplateTextTooLong', retryable: false, http_status: 400 },
  '132007': { error_code: 'TemplateFormatViolation', retryable: false, http_status: 400 },
  '132012': { error_code: 'TemplateParamFormatMismatch', retryable: false, http_status: 400 },
  '131031': { error_code: 'AccountLocked', retryable: false, http_status: 403 },
  '368': { error_code: 'AccountRestricted', retryable: false, http_status: 403 },
  '190': { error_code: 'TokenExpired', retryable: false, http_status: 401 },
  '2': { error_code: 'ServiceUnavailable', retryable: true, http_status: 503 },
  '131016': { error_code: 'ServiceUnavailable', retryable: true, http_status: 503 },
  '133004': { error_code: 'ServiceUnavailable', retryable: true, http_status: 503 },
  '131052': { error_code: 'MediaDownloadError', retryable: true, http_status: 400 },
  '131053': { error_code: 'MediaUploadError', retryable: true, http_status: 400 },
  '131042': { error_code: 'PaymentIssue', retryable: false, http_status: 400 },
  '131005': { error_code: 'AccessDenied', retryable: false, http_status: 403 },
  '10': { error_code: 'PermissionDenied', retryable: false, http_status: 403 },
  '4': { error_code: 'TooManyCalls', retryable: true, http_status: 429 },
  '80007': { error_code: 'RateLimitHit', retryable: true, http_status: 429 },
  '131049': { error_code: 'MessageNotDelivered', retryable: false, http_status: 400 },
  '131000': { error_code: 'GenericError', retryable: true, http_status: 500 },
  '100': { error_code: 'InvalidParameter', retryable: false, http_status: 400 },
  '131008': { error_code: 'MissingParameter', retryable: false, http_status: 400 },
  '131009': { error_code: 'InvalidParameterValue', retryable: false, http_status: 400 },
  '131051': { error_code: 'UnsupportedMessageType', retryable: false, http_status: 400 },
  '131021': { error_code: 'RecipientCannotBeSender', retryable: false, http_status: 400 },
  '131057': { error_code: 'AccountMaintenance', retryable: true, http_status: 503 },
  '130497': { error_code: 'CountryRestriction', retryable: false, http_status: 403 },
  '132068': { error_code: 'FlowBlocked', retryable: false, http_status: 400 },
  '132069': { error_code: 'FlowThrottled', retryable: true, http_status: 429 },
  // Subcode-specific errors (format: errorCode_subcode)
  '100_33': { error_code: 'PhoneNumberDisconnected', retryable: false, http_status: 400 },
};

// ==========================================
// Locale Messages Map (lazy-loaded)
// ==========================================

let localeMessagesCache: Record<Locale, Record<string, LocaleErrorData>> | null = null;

function loadLocaleMessages(): Record<Locale, Record<string, LocaleErrorData>> {
  if (localeMessagesCache) {
    return localeMessagesCache;
  }

  const enPath = join(__dirname, 'locales', 'en.json');
  const idPath = join(__dirname, 'locales', 'id.json');

  localeMessagesCache = {
    en: JSON.parse(readFileSync(enPath, 'utf-8')),
    id: JSON.parse(readFileSync(idPath, 'utf-8')),
  };

  return localeMessagesCache;
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Parse Accept-Language header and return the best matching locale
 * @param acceptLanguage - The Accept-Language header value
 * @returns The best matching locale (defaults to 'id')
 */
export function getLocaleFromHeader(acceptLanguage: string | undefined): Locale {
  if (!acceptLanguage) {
    return 'id'; // Default to Indonesian
  }

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,id;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(), // Get primary language tag
        q: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.q - a.q);

  // Find first matching locale
  for (const lang of languages) {
    if (lang.code === 'en') return 'en';
    if (lang.code === 'id') return 'id';
  }

  return 'id'; // Default to Indonesian
}

/**
 * Get WhatsApp error message for a specific error code and locale
 * @param code - The WhatsApp error code
 * @param locale - The locale to use
 * @param subcode - Optional subcode for more specific errors
 * @returns The error message object or null if not found
 */
export function getWhatsAppErrorMessage(
  code: number,
  locale: Locale,
  subcode?: number
): WhatsAppErrorMessage | null {
  // Check for subcode-specific error first
  const subcodeKey = subcode !== undefined ? `${code}_${subcode}` : null;
  const codeKey = String(code);

  // Try subcode-specific first, then fall back to main code
  const lookupKey = subcodeKey && ERROR_METADATA[subcodeKey] ? subcodeKey : codeKey;

  const metadata = ERROR_METADATA[lookupKey];
  if (!metadata) {
    return null;
  }

  const localeMessages = loadLocaleMessages();
  const messages = localeMessages[locale];
  const localeData = messages[lookupKey];

  if (!localeData) {
    return null;
  }

  return {
    error_code: metadata.error_code,
    message: localeData.message,
    recovery_action: localeData.recovery_action,
    category: localeData.category,
    retryable: metadata.retryable,
    http_status: metadata.http_status,
  };
}

/**
 * Format WhatsApp API error response with locale support
 * @param code - The WhatsApp error code
 * @param locale - The locale to use
 * @param subcode - Optional subcode for more specific errors
 * @returns Formatted error response object
 */
export function formatWhatsAppApiError(
  code: number,
  locale: Locale,
  subcode?: number
): { error: WhatsAppErrorMessage } | null {
  const errorMessage = getWhatsAppErrorMessage(code, locale, subcode);

  if (!errorMessage) {
    return null;
  }

  return {
    error: errorMessage,
  };
}

/**
 * Get all available error codes
 * @returns Array of all supported error codes
 */
export function getAllErrorCodes(): string[] {
  return Object.keys(ERROR_METADATA);
}

/**
 * Check if an error code is supported
 * @param code - The error code to check
 * @param subcode - Optional subcode
 * @returns True if the error code is supported
 */
export function isKnownErrorCode(code: number, subcode?: number): boolean {
  const subcodeKey = subcode !== undefined ? `${code}_${subcode}` : null;
  const codeKey = String(code);

  return !!(subcodeKey && ERROR_METADATA[subcodeKey]) || !!ERROR_METADATA[codeKey];
}

/**
 * Get error metadata without locale-specific content
 * Useful for determining retryable status without fetching full message
 * @param code - The error code
 * @param subcode - Optional subcode
 * @returns Error metadata or null
 */
export function getErrorMetadata(
  code: number,
  subcode?: number
): { error_code: string; retryable: boolean; http_status: 400 | 401 | 403 | 404 | 429 | 500 | 503 } | null {
  const subcodeKey = subcode !== undefined ? `${code}_${subcode}` : null;
  const codeKey = String(code);
  const lookupKey = subcodeKey && ERROR_METADATA[subcodeKey] ? subcodeKey : codeKey;

  return ERROR_METADATA[lookupKey] ?? null;
}
