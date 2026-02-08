/**
 * Xendit Webhook Routes
 * 
 * Handles payment callback notifications from Xendit payment gateway.
 * Supports Invoice API callbacks (Payment Links).
 * Xendit sends callbacks as JSON with X-Callback-Token header for verification.
 * 
 * Invoice callback statuses:
 * - PAID: Payment completed successfully
 * - EXPIRED: Invoice expired without payment
 * - PENDING: Waiting for payment (rarely sent as callback)
 * 
 * Requirements: 5.1, 5.3, 5.5
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { logger } from '../../utils/logger.js';
import { xenditProvider } from '../../services/payment/providers/xendit-provider.js';
import { prisma } from '../../utils/database.js';
import { auditLog } from '../../utils/auditLog.js';

const app = new Hono();

/**
 * Get client IP address from request
 * Handles various proxy headers
 */
function getClientIP(c: Context): string {
  const xForwardedFor = c.req.header('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  const xRealIP = c.req.header('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }
  
  return 'unknown';
}

// =============================================================================
// POST /api/v1/webhooks/xendit/callback
// Receive payment notification from Xendit Invoice API
// No auth required - validates X-Callback-Token instead
// 
// Xendit sends Invoice callbacks as JSON with X-Callback-Token header
// Callback is sent when invoice status changes (PAID, EXPIRED)
// 
// Requirements: 5.1, 5.3, 5.5
// =============================================================================

app.post('/callback', async (c: Context) => {
  const clientIP = getClientIP(c);
  const receivedAt = new Date().toISOString();
  
  try {
    const contentType = c.req.header('Content-Type') || '';
    
    // Log incoming webhook (Requirements: 5.5)
    logger.info('Xendit Invoice callback received', {
      contentType,
      method: c.req.method,
      clientIP,
      timestamp: receivedAt,
    });

    // Xendit sends callbacks as JSON
    if (!contentType.includes('application/json')) {
      logger.warn('Xendit callback received with unexpected content type', {
        contentType,
        clientIP,
      });
    }

    // Get raw body for logging and parsing
    const rawBody = await c.req.text();
    
    // Check body size limit (1MB max)
    if (rawBody.length > 1048576) {
      logger.error('Xendit callback payload too large', { size: rawBody.length });
      return c.json({ error: 'Payload too large' }, 413);
    }

    // Parse JSON payload
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      logger.error('Xendit callback JSON parsing failed', { 
        error: parseError,
        rawBody: rawBody.substring(0, 500), // Log first 500 chars for debugging
      });
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    // Extract headers for validation
    const headers: Record<string, string> = {};
    const callbackToken = c.req.header('X-Callback-Token') || c.req.header('x-callback-token');
    if (callbackToken) {
      headers['x-callback-token'] = callbackToken;
    }

    // Log parsed payload (sanitized) - include Invoice-specific fields
    const payloadObj = payload as Record<string, unknown>;
    logger.debug('Xendit Invoice callback payload parsed', {
      hasPayload: !!payload,
      payloadType: typeof payload,
      hasCallbackToken: !!callbackToken,
      invoiceId: payloadObj.id,
      externalId: payloadObj.external_id,
      status: payloadObj.status,
      paymentMethod: payloadObj.payment_method,
      paymentChannel: payloadObj.payment_channel,
    });

    // Validate callback through XenditProvider (Requirements: 5.3)
    const validationResult = await xenditProvider.validateCallback(payload, headers);

    if (!validationResult.valid) {
      logger.warn('Xendit callback validation failed', {
        error: validationResult.error,
        clientIP,
        timestamp: receivedAt,
      });
      return c.json({ error: validationResult.error || 'Invalid callback' }, 401);
    }

    logger.info('Xendit callback validated successfully', {
      orderId: validationResult.orderId,
      status: validationResult.status,
      amount: validationResult.amount,
    });

    // Process the validated callback - update transaction and activate subscription if needed
    if (validationResult.orderId && validationResult.status) {
      try {
        const orderId = validationResult.orderId;
        
        // Find transaction
        const transaction = await prisma.paymentTransaction.findUnique({
          where: { orderId },
          include: { user: true },
        });

        if (!transaction) {
          logger.warn('Xendit callback: transaction not found', { orderId });
          return c.json({ success: true, message: 'Transaction not found' });
        }

        // Idempotency check - skip if already processed
        if (transaction.status !== 'PENDING') {
          logger.info('Xendit callback already processed (idempotency)', {
            orderId,
            currentStatus: transaction.status,
          });
          return c.json({ success: true, message: 'Already processed' });
        }

        // Map status
        const callbackStatus = validationResult.status === 'SUCCESS' ? 'COMPLETED' : 
                               validationResult.status === 'FAILED' ? 'FAILED' :
                               validationResult.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING';
        const paidAt = callbackStatus === 'COMPLETED' ? new Date() : null;

        // Update transaction
        await prisma.paymentTransaction.update({
          where: { orderId },
          data: {
            status: callbackStatus,
            paidAt,
            callbackPayload: payload as object,
          },
        });

        // Log callback for audit - include payment method info from Invoice
        const invoicePayload = payload as Record<string, unknown>;
        await auditLog(
          'payment_callback_received',
          'payment_transaction',
          orderId,
          {
            status: callbackStatus,
            amount: validationResult.amount,
            provider: 'xendit',
            paymentMethod: invoicePayload.payment_method,
            paymentChannel: invoicePayload.payment_channel,
          },
          transaction.userId
        );

        // If successful, activate subscription (import paymentService dynamically to avoid circular deps)
        if (callbackStatus === 'COMPLETED') {
          const { paymentService } = await import('../../services/payment-service.js');
          await paymentService.activateSubscription(
            transaction.userId, 
            transaction.targetTier, 
            orderId, 
            transaction.amount
          );
        }
        
        logger.info('Xendit callback processed successfully', {
          orderId: validationResult.orderId,
          status: callbackStatus,
        });
      } catch (processError) {
        logger.error('Xendit callback processing failed', {
          error: processError instanceof Error ? processError.message : 'Unknown error',
          orderId: validationResult.orderId,
        });
        // Still return 200 to Xendit to prevent retries for processing errors
      }
    }

    // Return success response to Xendit
    return c.json({ success: true });
  } catch (error) {
    logger.error('Xendit callback error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      clientIP,
    });
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
