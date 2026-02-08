import cron from 'node-cron';
import { prisma } from '../utils/database.js';
import { logger } from '../utils/logger.js';

/**
 * Delete WebhookDeliveryLog entries older than 7 days
 * Requirement 3.6: Delivery logs retained for 7 days
 */
export async function cleanupDeliveryLogs(): Promise<number> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const result = await prisma.webhookDeliveryLog.deleteMany({
    where: {
      createdAt: {
        lt: sevenDaysAgo
      }
    }
  });

  return result.count;
}

/**
 * Cron job to cleanup old webhook delivery logs
 * Runs daily at 3:00 AM (off-peak hours)
 */
export function startDeliveryLogCleanupJob() {
  // Run daily at 3:00 AM
  cron.schedule('0 3 * * *', async () => {
    try {
      const count = await cleanupDeliveryLogs();
      if (count > 0) {
        logger.info(`✅ Deleted ${count} webhook delivery logs older than 7 days`);
      }
    } catch (error) {
      logger.error('❌ Error cleaning up delivery logs:', error);
    }
  });

  logger.info('🗑️  Delivery log cleanup cron job started (runs daily at 3:00 AM)');
}
