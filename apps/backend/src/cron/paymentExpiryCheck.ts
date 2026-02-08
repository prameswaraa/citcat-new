/**
 * Payment Expiry Check Cron Job
 * 
 * Runs every 5 minutes to:
 * 1. Query PENDING payments that have expired (expiresAt < now)
 * 2. Update status to CANCELLED
 * 
 * This ensures payments that are not completed within 15 minutes are automatically cancelled.
 */

import cron from 'node-cron';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { auditLog } from '../utils/auditLog.js';

/**
 * Get expired pending payments
 */
async function getExpiredPendingPayments() {
  const now = new Date();

  return prisma.paymentTransaction.findMany({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: now,
      },
    },
    select: {
      id: true,
      orderId: true,
      userId: true,
      amount: true,
      targetTier: true,
      expiresAt: true,
    },
  });
}

/**
 * Cancel expired payment
 */
async function cancelExpiredPayment(payment: {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  targetTier: string;
  expiresAt: Date;
}): Promise<boolean> {
  try {
    await prisma.paymentTransaction.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED' },
    });

    await auditLog(
      'payment_auto_cancelled',
      'payment_transaction',
      payment.orderId,
      {
        reason: 'expired',
        expiredAt: payment.expiresAt.toISOString(),
        amount: payment.amount,
        targetTier: payment.targetTier,
      },
      payment.userId
    );

    logger.info('Payment auto-cancelled due to expiry', {
      orderId: payment.orderId,
      userId: payment.userId,
      expiredAt: payment.expiresAt,
    });

    return true;
  } catch (error) {
    logger.error('Failed to cancel expired payment', {
      orderId: payment.orderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Main function to check and cancel expired payments
 */
export async function checkExpiredPayments(): Promise<{ cancelled: number }> {
  const results = { cancelled: 0 };

  try {
    const expiredPayments = await getExpiredPendingPayments();

    for (const payment of expiredPayments) {
      const cancelled = await cancelExpiredPayment(payment);
      if (cancelled) results.cancelled++;
    }

    if (results.cancelled > 0) {
      logger.info('Expired payments check completed', {
        cancelled: results.cancelled,
      });
    }

    return results;
  } catch (error) {
    logger.error('Error in expired payments check', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return results;
  }
}

/**
 * Start the payment expiry check cron job
 * Runs every 5 minutes
 */
export function startPaymentExpiryCheckJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const results = await checkExpiredPayments();
      
      if (results.cancelled > 0) {
        logger.info('✅ Payment expiry check completed', {
          cancelled: results.cancelled,
        });
      }
    } catch (error) {
      logger.error('❌ Error in payment expiry check cron job:', error);
    }
  });

  logger.info('📅 Payment expiry check cron job started (runs every 5 minutes)');
}
