/**
 * Instagram Routes - Main Router
 * Aggregates all Instagram-related routes
 * 
 * This module combines all Instagram DM integration routes into a single router.
 * Routes are organized by functionality:
 * - /auth/* - OAuth connection flow
 * - /connection/* - Connection status and management
 * - /tokens/* - Token management
 * - /webhooks - Webhook handling (no auth, verified by Meta signature)
 * - /conversations/* - Conversation management
 * - /messages/* - Message sending and reactions
 * 
 * Authentication is applied at the main app level for all routes except webhooks.
 * 
 * Requirements: All (1.x, 2.x, 3.x, 4.x, 5.x, 6.x)
 */

import { Hono } from 'hono'
import connectionRoutes from './connection.js'
import tokenRoutes from './tokens.js'
import webhookRoutes from './webhooks.js'
import conversationRoutes from './conversations.js'
import messageRoutes from './messages.js'

const app = new Hono()

/**
 * Connection routes - OAuth flow and account management
 * 
 * Endpoints:
 * - GET /auth/url - Generate Instagram OAuth URL (Requirement 1.1)
 * - GET /auth/callback - Handle OAuth callback (Requirements 1.2-1.8)
 * - GET /connection/status - Get current connection status (Requirement 1.5)
 * - DELETE /connection - Disconnect Instagram account (Requirement 1.5)
 * 
 * Note: The connection routes handle both /auth/* and /connection/* paths
 * by mounting at root and using internal route definitions
 */
app.route('/auth', connectionRoutes)
app.route('/connection', connectionRoutes)

/**
 * Token management routes
 * 
 * Endpoints:
 * - POST /tokens/refresh - Manually trigger token refresh (Requirements 5.1, 5.2)
 * - GET /tokens/status - Check token expiration status (Requirement 5.3)
 */
app.route('/tokens', tokenRoutes)

/**
 * Webhook routes - No authentication required
 * Webhooks are verified using Meta's X-Hub-Signature-256 header
 * 
 * Endpoints:
 * - GET /webhooks - Webhook verification (hub.challenge) (Requirement 2.1)
 * - POST /webhooks - Receive webhook events (Requirements 2.1-2.10)
 */
app.route('/webhooks', webhookRoutes)

/**
 * Conversation routes
 * 
 * Endpoints:
 * - GET /conversations - List conversations with pagination (Requirement 4.1)
 * - GET /conversations/search - Search by username or message content (Requirement 4.5)
 * - GET /conversations/:id - Get conversation detail (Requirement 4.2)
 * - GET /conversations/:id/messages - Get messages with pagination (Requirement 4.2)
 * - POST /conversations/:id/read - Mark messages as read (Requirement 4.4)
 */
app.route('/conversations', conversationRoutes)

/**
 * Message routes - Sending messages and reactions
 * 
 * Endpoints:
 * - POST /conversations/:id/messages - Send message (Requirements 3.1-3.5, 3.9, 3.10)
 * - POST /messages/:id/react - React to message with 'love' (Requirement 3.6)
 */
app.route('/', messageRoutes)

export default app
