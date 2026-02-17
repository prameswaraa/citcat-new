/**
 * WABA Routes - Main Router
 * Modular WABA routes for better maintainability
 */

import { Hono } from 'hono'
import type { Context } from 'hono'
import signupRoutes from './signup.js'
import manualRoutes from './manual.js'
import phoneNumberRoutes from './phone-numbers.js'
import connectionRoutes from './connection.js'
import tokenRoutes from './tokens.js'
import coexistenceRoutes from './coexistence.js'
import healthRoutes from './health.js'
import { getWhatsAppAccountsForUser } from '../../utils/whatsapp-account-helper.js'

const app = new Hono()

// GET /accounts - List all WhatsApp accounts for the user
app.get('/accounts', async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const accounts = await getWhatsAppAccountsForUser(c.user.id, false)

    return c.json({
      data: accounts.map(account => ({
        id: account.id,
        wabaId: account.wabaId,
        wabaName: account.wabaName,
        connectionStatus: account.connectionStatus,
        connectedAt: account.connectedAt,
        lastSyncAt: account.lastSyncAt,
        isCoexistence: account.isCoexistence,
        isManualLogin: (account as any).isManualLogin || false,
        phoneNumbers: account.phoneNumbers.map(pn => ({
          id: pn.id,
          phoneNumberId: pn.phoneNumberId,
          displayPhoneNumber: pn.displayPhoneNumber,
          verifiedName: pn.verifiedName,
          qualityRating: pn.qualityRating,
          messagingLimitTier: pn.messagingLimitTier,
          isVerified: pn.isVerified,
          isPrimary: pn.isPrimary,
          codeVerificationStatus: pn.codeVerificationStatus,
          accountMode: pn.accountMode,
          nameStatus: pn.nameStatus,
          status: pn.status,
        })),
      })),
    })
  } catch (error) {
    console.error('Failed to list WhatsApp accounts:', error)
    return c.json({ error: { code: 'FETCH_FAILED', message: 'Failed to list accounts' } }, 500)
  }
})

// Signup & OAuth routes
app.route('/signup', signupRoutes)

// Manual login routes (user provides own access token)
app.route('/manual', manualRoutes)

// WABA-specific routes (with :wabaId parameter)
// Phone numbers
app.route('/:wabaId/phone-numbers', phoneNumberRoutes)

// Health monitoring
app.route('/:wabaId', healthRoutes)

// Coexistence operations
app.route('/:wabaId', coexistenceRoutes)

// Connection management
app.route('/:wabaId', connectionRoutes)

// Token management
app.route('/:wabaId', tokenRoutes)

export default app
