/**
 * Input Sanitization Utilities
 * 
 * Provides functions to sanitize user input before including in emails,
 * logs, or other outputs to prevent XSS and injection attacks.
 */

/**
 * HTML entities to escape
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML special characters to prevent XSS
 * 
 * @param input - String to sanitize
 * @returns Sanitized string safe for HTML inclusion
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize email address for safe inclusion in templates
 * Validates format and escapes HTML
 * 
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) {
    return '';
  }
  
  // Escape any HTML characters (shouldn't be in valid emails, but safety first)
  return escapeHtml(trimmed);
}

/**
 * Sanitize user name for safe inclusion in templates
 * Removes control characters and escapes HTML
 * 
 * @param name - User name to sanitize
 * @returns Sanitized name
 */
export function sanitizeName(name: string): string {
  if (typeof name !== 'string') {
    return '';
  }
  
  // Remove control characters and trim
  const cleaned = name
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
  
  // Escape HTML
  return escapeHtml(cleaned);
}

/**
 * Sanitize OTP code - ensure it's only digits
 * 
 * @param otp - OTP code to sanitize
 * @returns Sanitized OTP or empty string if invalid
 */
export function sanitizeOTP(otp: string): string {
  if (typeof otp !== 'string') {
    return '';
  }
  
  // Only allow digits
  const digitsOnly = otp.replace(/\D/g, '');
  
  // Must be exactly 6 digits
  if (digitsOnly.length !== 6) {
    return '';
  }
  
  return digitsOnly;
}

/**
 * Sanitize IP address for logging
 * 
 * @param ip - IP address to sanitize
 * @returns Sanitized IP or 'unknown'
 */
export function sanitizeIP(ip: string | undefined | null): string {
  if (!ip || typeof ip !== 'string') {
    return 'unknown';
  }
  
  // Remove any non-IP characters (allow IPv4 and IPv6)
  const cleaned = ip.trim();
  
  // Basic IPv4 pattern
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  // Basic IPv6 pattern (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  if (ipv4Regex.test(cleaned) || ipv6Regex.test(cleaned)) {
    return cleaned;
  }
  
  // Handle localhost
  if (cleaned === 'localhost' || cleaned === '::1') {
    return cleaned;
  }
  
  return 'unknown';
}

/**
 * Sanitize object for logging - removes sensitive fields and escapes values
 * 
 * @param obj - Object to sanitize
 * @param sensitiveFields - Fields to redact
 * @returns Sanitized object safe for logging
 */
export function sanitizeForLogging(
  obj: Record<string, unknown>,
  sensitiveFields: string[] = ['password', 'passwordHash', 'token', 'secret', 'otp', 'otpHash']
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      result[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeForLogging(value as Record<string, unknown>, sensitiveFields);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}
