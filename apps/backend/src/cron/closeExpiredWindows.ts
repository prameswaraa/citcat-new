import cron from 'node-cron'
import { closeExpiredWindows } from '../utils/messageWindow.js'

/**
 * Cron job to close expired 24-hour windows
 * Runs every 5 minutes to update isWindowActive flag
 */
export function startWindowClosureJob() {
  // Run every 5 minutes (reduced from every minute to prevent connection pool exhaustion)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await closeExpiredWindows()
      if (count > 0) {
        console.log(`✅ Closed ${count} expired messaging windows`)
      }
    } catch (error) {
      console.error('❌ Error closing expired windows:', error)
    }
  })

  console.log('🕐 Window closure cron job started (runs every 5 minutes)')
}
