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
import { notificationService } from '../../services/notification-service.js';

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

        // ===========================================================================
        // SECURITY: Amount validation - verify callback amount matches transaction
        // Prevents attacks where attacker manipulates callback amount
        // ===========================================================================
        const callbackAmount = validationResult.amount;
        if (callbackAmount !== undefined && callbackAmount !== transaction.amount) {
          logger.error('Amount mismatch in Xendit callback - potential tampering detected', {
            orderId,
            callbackAmount,
            expectedAmount: transaction.amount,
            userId: transaction.userId,
          });
          
          await auditLog(
            'payment_callback_amount_mismatch',
            'payment_transaction',
            orderId,
            {
              callbackAmount,
              expectedAmount: transaction.amount,
              provider: 'xendit',
            },
            transaction.userId
          );
          
          return c.json({ error: 'Amount mismatch' }, 400);
        }

        // Map status
        const callbackStatus = validationResult.status === 'SUCCESS' ? 'COMPLETED' : 
                               validationResult.status === 'FAILED' ? 'FAILED' :
                               validationResult.status === 'EXPIRED' ? 'EXPIRED' : 'PENDING';
        const paidAt = callbackStatus === 'COMPLETED' ? new Date() : null;
        
        // Check transaction type (TOP_UP vs SUBSCRIPTION)
        const transactionType = (transaction as any).transactionType || 'SUBSCRIPTION';
        const creditUsed = (transaction as any).creditUsed || 0;

        // ===========================================================================
        // Handle TOP_UP: Use atomic transaction for status update + credit addition
        // This ensures both operations succeed or both fail (no partial state)
        // ===========================================================================
        if (callbackStatus === 'COMPLETED' && transactionType === 'TOP_UP') {
          // Atomic operation: update transaction status AND add credit
          await prisma.$transaction(async (tx) => {
            // 1. Update transaction status
            await tx.paymentTransaction.update({
              where: { orderId },
              data: {
                status: 'COMPLETED',
                paidAt,
                callbackPayload: payload as object,
              },
            });
            
            // 2. Add credit to user balance
            const creditBalance = await tx.creditBalance.upsert({
              where: { userId: transaction.userId },
              update: {},
              create: { userId: transaction.userId, balance: 0 },
            });
            
            const balanceBefore = creditBalance.balance;
            const balanceAfter = balanceBefore + transaction.amount;
            
            await tx.creditBalance.update({
              where: { userId: transaction.userId },
              data: { balance: balanceAfter },
            });
            
            // 3. Create credit transaction record
            await tx.creditTransaction.create({
              data: {
                userId: transaction.userId,
                type: 'TOP_UP',
                amount: transaction.amount,
                balanceBefore,
                balanceAfter,
                orderId,
                paymentTransactionId: transaction.id,
              },
            });
          });
          
          logger.info('Top-up credit added (atomic)', {
            userId: transaction.userId,
            amount: transaction.amount,
            orderId,
          });
          
          // Log callback for audit (outside transaction - non-critical)
          const invoicePayload = payload as Record<string, unknown>;
          await auditLog(
            'payment_callback_received',
            'payment_transaction',
            orderId,
            {
              status: 'COMPLETED',
              type: 'TOP_UP',
              amount: validationResult.amount,
              provider: 'xendit',
              paymentMethod: invoicePayload.payment_method,
              paymentChannel: invoicePayload.payment_channel,
            },
            transaction.userId
          );
          
          // Create notification for top-up success
          await notificationService.createPaymentNotification(transaction.userId, 'success', orderId);
          
          logger.info('Xendit callback processed (TOP_UP)', {
            orderId,
            status: callbackStatus,
            userId: transaction.userId,
            amount: transaction.amount,
          });
          
          return c.json({ success: true });
        }

        // ===========================================================================
        // Handle SUBSCRIPTION and non-COMPLETED statuses
        // ===========================================================================
        
        // Update transaction status
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

        // If successful subscription, handle credit deduction and activation
        if (callbackStatus === 'COMPLETED') {
          // SUBSCRIPTION: Deduct credit first (Skenario B), then activate subscription
          const { creditService } = await import('../../services/credit-service.js');
          const { paymentService } = await import('../../services/payment-service.js');
          
          // ===========================================================================
          // SECURITY FIX: Skenario B - Deduct credit if creditUsed > 0
          // Credit deduction MUST succeed before subscription activation
          // If credit deduction fails, abort callback to prevent free subscription
          // ===========================================================================
          if (creditUsed > 0) {
            try {
              await creditService.deductCredit({
                userId: transaction.userId,
                amount: creditUsed,
                type: 'PAYMENT_USED',
                orderId,
              });
              
              logger.info('Credit deducted for subscription payment', {
                userId: transaction.userId,
                creditUsed,
                orderId,
              });
            } catch (creditError) {
              // SECURITY: Credit deduction failed - DO NOT activate subscription
              // This prevents users from getting free subscriptions
              logger.error('Credit deduction failed - aborting subscription activation', {
                userId: transaction.userId,
                creditUsed,
                orderId,
                error: creditError instanceof Error ? creditError.message : 'Unknown error',
              });
              
              await auditLog(
                'payment_callback_credit_deduction_failed',
                'payment_transaction',
                orderId,
                {
                  creditUsed,
                  error: creditError instanceof Error ? creditError.message : 'Unknown error',
                  provider: 'xendit',
                },
                transaction.userId
              );
              
              // Rethrow to fail the callback - Xendit will retry
              throw new Error(`Credit deduction failed: ${creditError instanceof Error ? creditError.message : 'Unknown error'}`);
            }
          }
          
          // Activate subscription (only reached if credit deduction succeeded or no credit used)
          await paymentService.activateSubscription(
            transaction.userId, 
            transaction.targetTier, 
            orderId, 
            transaction.amount
          );
          
          // Create notification for subscription success
          await notificationService.createPaymentNotification(transaction.userId, 'success', orderId);
        } else if (callbackStatus === 'FAILED') {
          // Create failure notification
          await notificationService.createPaymentNotification(transaction.userId, 'failed', orderId);
        }
        
        logger.info('Xendit callback processed successfully', {
          orderId: validationResult.orderId,
          status: callbackStatus,
        });
      } catch (processError) {
        const errorMessage = processError instanceof Error ? processError.message : 'Unknown error';
        logger.error('Xendit callback processing failed', {
          error: errorMessage,
          orderId: validationResult.orderId,
        });
        
        // SECURITY: If error is related to credit deduction, return error to trigger retry
        // This ensures Xendit retries the callback until credit deduction succeeds
        if (errorMessage.includes('Credit deduction failed')) {
          return c.json({ error: 'Processing failed - retry required' }, 500);
        }
        
        // For other processing errors, return 200 to prevent infinite retries
        return c.json({ success: true, message: 'Processed with errors' });
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
