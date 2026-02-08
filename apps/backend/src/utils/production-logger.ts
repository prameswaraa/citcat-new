// Safe logger that only logs in development
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  info: (message: string, data?: any) => {
    if (isDevelopment) {
      console.log(`ℹ️ ${message}`, data || '')
    }
  },
  
  error: (message: string, error?: any) => {
    // Always log errors but sanitize sensitive data
    const sanitizedError = error?.message || error
    console.error(`❌ ${message}`, sanitizedError)
  },
  
  warn: (message: string, data?: any) => {
    if (isDevelopment) {
      console.warn(`⚠️ ${message}`, data || '')
    }
  },
  
  debug: (message: string, data?: any) => {
    if (isDevelopment) {
      console.debug(`🔍 ${message}`, data || '')
    }
  },
  
  // Audit logging (always log security events)
  audit: (event: string, userId?: string, details?: any) => {
    console.log(`🔐 AUDIT: ${event}`, {
      userId,
      timestamp: new Date().toISOString(),
      // Don't log sensitive details in production
      ...(isDevelopment ? details : {})
    })
  }
}
