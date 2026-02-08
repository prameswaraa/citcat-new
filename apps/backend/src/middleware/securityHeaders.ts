import type { Context, Next } from 'hono'

/**
 * Security headers middleware
 * Adds essential security headers to all responses
 */
export async function securityHeaders(c: Context, next: Next) {
  await next()

  // Prevent MIME type sniffing
  c.header('X-Content-Type-Options', 'nosniff')

  // Prevent clickjacking attacks
  c.header('X-Frame-Options', 'DENY')

  // Enable XSS filter in browsers
  c.header('X-XSS-Protection', '1; mode=block')

  // Enforce HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Referrer policy
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (restrict browser features)
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')

  // Content Security Policy (basic)
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  )
}
