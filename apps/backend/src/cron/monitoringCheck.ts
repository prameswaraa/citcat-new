import cron from 'node-cron'
import { wabaMetrics } from '../services/monitoring/index.js'

/**
 * Check system metrics and send alerts if thresholds are exceeded
 */
async function checkAndAlert() {
  try {
    const metrics = await wabaMetrics.getSystemMetrics()
    
    console.log('📊 System metrics:', {
      totalUsers: metrics.totalUsers,
      connectedUsers: metrics.connectedUsers,
      totalMessages: metrics.totalMessages
    })
    
    // Add logic here for sending alerts if needed
    // For example, check if connected users < threshold, etc.
    
  } catch (error) {
    console.error('❌ Monitoring check failed:', error)
    throw error
  }
}

/**
 * Monitoring Check Cron Job
 * 
 * Runs every 15 minutes to check metrics and send alerts if thresholds are exceeded
 * Schedule: every 15 minutes (cron: "star-slash-15 star star star star")
 */
export function startMonitoringCheckJob() {
  // Run every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    console.log('🔍 Running monitoring check...')
    await checkAndAlert()
    console.log('✅ Monitoring check completed successfully')
  })

  console.log('✅ Monitoring check cron job started (runs every 15 minutes)')
}

/**
 * Run monitoring check immediately (for testing)
 */
export async function runMonitoringCheckNow() {
  console.log('🔍 Running monitoring check now...')
  await checkAndAlert()
  console.log('✅ Monitoring check completed successfully')
}
