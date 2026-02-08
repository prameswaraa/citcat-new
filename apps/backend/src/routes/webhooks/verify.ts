import { Hono } from 'hono'
import type { Context } from 'hono'
import { timingSafeEqual } from 'crypto'
import { settingsCache, CACHE_KEYS, CACHE_TTL } from '../../services/settings-cache.js'
import type { WhatsAppSettings } from '../../types/admin-settings.js'

const app = new Hono()

/**
 * Get verify token from database or environment
 * Requirements: 6.3, 6.4 - Check database first, fallback to .env
 */
async function getVerifyToken(): Promise<string | undefined> {
  try {
    // Check cache first
    const cachedSettings = settingsCache.get<WhatsAppSettings>(CACHE_KEYS.whatsapp())
    if (cachedSettings?.verifyToken && !cachedSettings.verifyToken.includes('****')) {
      return cachedSettings.verifyToken
    }

    // Fetch from database
    const { adminSettingsService } = await import('../../services/admin/settings-service.js')
    const response = await adminSettingsService.getSettings<WhatsAppSettings>('whatsapp', false)
    
    // Cache the settings
    settingsCache.set(CACHE_KEYS.whatsapp(), response.data, CACHE_TTL.settings)
    
    if (response.data.verifyToken && !response.data.verifyToken.includes('****')) {
      return response.data.verifyToken
    }
  } catch (error) {
    console.warn('Failed to get verify token from database, using env')
  }

  // Fallback to env
  return process.env.META_VERIFY_TOKEN
}

// GET /api/v1/webhooks - Webhook verification
app.get('/', async (c: Context) => {
  try {
    const mode = c.req.query('hub.mode')
    const token = c.req.query('hub.verify_token')
    const challenge = c.req.query('hub.challenge')

    // Get verify token from database or env
    const verifyToken = await getVerifyToken()

    if (!verifyToken) {
      console.error('❌ CRITICAL: META_VERIFY_TOKEN not configured!')
      return c.json({ error: 'Server misconfigured' }, 500)
    }

    if (!mode || !token || !challenge) {
      console.warn('❌ Webhook verification failed - missing parameters')
      return c.json({ error: 'Missing parameters' }, 400)
    }

    // SECURITY: Use timing-safe comparison to prevent timing attacks
    if (mode === 'subscribe') {
      try {
        const tokenBuffer = Buffer.from(token)
        const verifyBuffer = Buffer.from(verifyToken)

        // Check length first (not secret)
        if (tokenBuffer.length !== verifyBuffer.length) {
          console.warn('❌ Webhook verification failed - token length mismatch')
          return c.json({ error: 'Verification failed' }, 403)
        }

        // Constant-time comparison
        if (timingSafeEqual(tokenBuffer, verifyBuffer)) {
          console.log('✅ Webhook verified successfully')
          return c.text(challenge)
        }
      } catch (err) {
        console.error('❌ Webhook verification comparison error:', err)
        return c.json({ error: 'Verification failed' }, 403)
      }
    }

    console.warn('❌ Webhook verification failed', {
      mode,
      hasToken: !!token,
      hasChallenge: !!challenge
    })
    return c.json({ error: 'Verification failed' }, 403)
  } catch (error) {
    console.error('❌ Webhook verification error:', error)
    return c.json({ error: 'Verification error' }, 500)
  }
})

export default app
