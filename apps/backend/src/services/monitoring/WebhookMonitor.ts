import { prisma } from '../../utils/database.js'

export interface WebhookMetrics {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  successRate: number
  avgProcessingTime: number
}

export class WebhookMonitor {
  /**
   * Log webhook event
   */
  async logEvent(
    userId: string,
    eventType: string,
    payload: any,
    processed: boolean = true,
    error?: string
  ): Promise<void> {
    try {
      await prisma.webhookEvent.create({
        data: {
          userId,
          eventType,
          payload,
          processed
        }
      })
    } catch (err) {
      console.error('Failed to log webhook event:', err)
    }
  }

  /**
   * Get webhook metrics for a user
   */
  async getMetrics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<WebhookMetrics> {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000)
    const end = endDate || new Date()

    const events = await prisma.webhookEvent.findMany({
      where: {
        userId,
        receivedAt: {
          gte: start,
          lte: end
        }
      }
    })

    const totalEvents = events.length
    const successfulEvents = events.filter(e => e.processed).length
    const failedEvents = totalEvents - successfulEvents
    const successRate = totalEvents > 0 ? (successfulEvents / totalEvents) * 100 : 100

    return {
      totalEvents,
      successfulEvents,
      failedEvents,
      successRate,
      avgProcessingTime: 0 // TODO: implement if needed
    }
  }

  /**
   * Get webhook health status
   */
  async getHealth(userId: string): Promise<{
    isHealthy: boolean
    successRate: number
    lastEventAt: Date | null
  }> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const metrics = await this.getMetrics(userId, oneHourAgo)

    const lastEvent = await prisma.webhookEvent.findFirst({
      where: { userId },
      orderBy: { receivedAt: 'desc' }
    })

    return {
      isHealthy: metrics.successRate >= 95,
      successRate: metrics.successRate,
      lastEventAt: lastEvent?.receivedAt || null
    }
  }
}

export const webhookMonitor = new WebhookMonitor()
