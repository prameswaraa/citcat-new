import cron from 'node-cron';
import { instagramService } from '../services/InstagramService.js';
import { emailService } from '../services/email/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../utils/database.js';

/**
 * Cron job to refresh Instagram access tokens
 * 
 * Runs daily at 3 AM to check for tokens expiring within 7 days
 * and refreshes them automatically.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */
export function startInstagramTokenRefreshJob() {
  // Run daily at 3 AM (offset from WABA refresh at 2 AM)
  cron.schedule('0 3 * * *', async () => {
    logger.info('Starting Instagram token refresh job');

    try {
      // Get all accounts with tokens expiring soon (within 7 days)
      // Only returns accounts that are at least 24 hours old (Requirement 5.1)
      const igAccountIds = await instagramService.getAccountsWithExpiringTokens();

      if (igAccountIds.length === 0) {
        logger.info('No Instagram tokens need refreshing');
        return;
      }

      logger.info(`Found ${igAccountIds.length} Instagram tokens to refresh`);

      // Refresh tokens in batches of 10 to avoid rate limits
      const batchSize = 10;
      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ igAccountId: string; error: string; consecutiveFailures: number }>,
      };

      for (let i = 0; i < igAccountIds.length; i += batchSize) {
        const batch = igAccountIds.slice(i, i + batchSize);

        await Promise.allSettled(
          batch.map(async (igAccountId) => {
            try {
              const result = await instagramService.refreshAccessToken(igAccountId);
              logger.info(`Instagram token refreshed for account ${igAccountId}, expires at ${result.expiresAt}`);
              
              // Reset consecutive failures on success
              await prisma.instagramAccount.update({
                where: { id: igAccountId },
                data: { 
                  connectionStatus: 'connected',
                  // Reset any failure tracking (stored in connection logs)
                },
              });
              
              results.success++;
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              logger.error(`Failed to refresh Instagram token for account ${igAccountId}: ${errorMessage}`);
              
              // Count consecutive failures from connection logs
              const consecutiveFailures = await countConsecutiveFailures(igAccountId);
              
              results.failed++;
              results.errors.push({ 
                igAccountId, 
                error: errorMessage,
                consecutiveFailures,
              });
            }
          })
        );

        // Wait 1 second between batches to avoid rate limits
        if (i + batchSize < igAccountIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      logger.info(
        `Instagram token refresh job completed: ${results.success} succeeded, ${results.failed} failed`
      );

      // Process failed refreshes (Requirement 5.3, 5.6)
      if (results.failed > 0) {
        logger.error('Failed Instagram token refreshes:', JSON.stringify(results.errors, null, 2));
        
        for (const errorInfo of results.errors) {
          await handleRefreshFailure(errorInfo);
        }
      }
    } catch (error) {
      logger.error('Instagram token refresh job error:', error);
    }
  });

  logger.info('Instagram token refresh cron job scheduled (daily at 3 AM)');
}


/**
 * Count consecutive token refresh failures for an Instagram account
 * by checking the connection logs
 */
async function countConsecutiveFailures(igAccountId: string): Promise<number> {
  // Get recent connection logs, ordered by timestamp descending
  const recentLogs = await prisma.iGConnectionLog.findMany({
    where: {
      instagramAccountId: igAccountId,
      action: {
        in: ['token_refreshed', 'token_refresh_failed'],
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: 10, // Check last 10 relevant logs
  });

  // Count consecutive failures from the most recent
  let consecutiveFailures = 0;
  for (const log of recentLogs) {
    if (log.action === 'token_refresh_failed') {
      consecutiveFailures++;
    } else {
      // Found a success, stop counting
      break;
    }
  }

  return consecutiveFailures;
}

/**
 * Handle a token refresh failure
 * - Send email notification (Requirement 5.3)
 * - Mark as requires_reauth after 3 consecutive failures (Requirement 5.6)
 */
async function handleRefreshFailure(errorInfo: {
  igAccountId: string;
  error: string;
  consecutiveFailures: number;
}): Promise<void> {
  const { igAccountId, error, consecutiveFailures } = errorInfo;

  try {
    // Get Instagram account with user details
    const igAccount = await prisma.instagramAccount.findUnique({
      where: { id: igAccountId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!igAccount || !igAccount.user) {
      logger.warn(`Instagram account ${igAccountId} or user not found for failure notification`);
      return;
    }

    // Check if this is the 3rd consecutive failure (Requirement 5.6)
    if (consecutiveFailures >= 3) {
      logger.warn(`Instagram account ${igAccountId} has ${consecutiveFailures} consecutive failures, marking as requires_reauth`);
      
      // Mark connection as requires_reauth
      await prisma.instagramAccount.update({
        where: { id: igAccountId },
        data: {
          connectionStatus: 'requires_reauth',
        },
      });

      // Log the status change
      await prisma.iGConnectionLog.create({
        data: {
          instagramAccountId: igAccountId,
          action: 'connection_requires_reauth',
          details: {
            reason: 'consecutive_refresh_failures',
            failureCount: consecutiveFailures,
          },
        },
      });

      // Send urgent notification for requires_reauth
      await emailService.sendTokenRefreshFailure(
        igAccount.igId,
        igAccount.username || 'Instagram Account',
        `URGENT: Your Instagram connection requires re-authentication after ${consecutiveFailures} consecutive token refresh failures. Please reconnect your Instagram account. Error: ${error}`,
        igAccount.user.email
      );
    } else {
      // Send regular failure notification (Requirement 5.3)
      await emailService.sendTokenRefreshFailure(
        igAccount.igId,
        igAccount.username || 'Instagram Account',
        `Instagram token refresh failed (attempt ${consecutiveFailures}/3). Error: ${error}`,
        igAccount.user.email
      );
    }
  } catch (notificationError) {
    logger.error(`Failed to send notification for Instagram account ${igAccountId}:`, notificationError);
  }
}

/**
 * Manually trigger Instagram token refresh for a specific account
 * Useful for testing or manual intervention
 */
export async function refreshInstagramTokenManually(igAccountId: string): Promise<{
  success: boolean;
  message: string;
  expiresAt?: Date;
}> {
  try {
    const result = await instagramService.refreshAccessToken(igAccountId);
    
    logger.info(`Instagram token manually refreshed for account ${igAccountId}`);
    
    return {
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Manual Instagram token refresh failed for account ${igAccountId}: ${errorMessage}`);
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}
