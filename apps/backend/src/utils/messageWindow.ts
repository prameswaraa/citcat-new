import { prisma } from './database.js'

/**
 * 24-Hour Messaging Window Utilities
 * Meta Policy: Businesses can send free-form messages within 24 hours after customer initiates conversation
 */

interface WindowStatus {
  isActive: boolean
  lastInboundMessageAt: Date | null
  windowExpiresAt: Date | null
  remainingTime: {
    hours: number
    minutes: number
    seconds: number
    totalSeconds: number
  } | null
  status: 'active' | 'expired' | 'never_messaged'
}

/**
 * Check if 24-hour window is still active
 */
export async function checkWindowStatus(customerId: string): Promise<WindowStatus> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      lastInboundMessageAt: true,
      windowExpiresAt: true,
      isWindowActive: true
    }
  })

  if (!customer) {
    throw new Error('Customer not found')
  }

  // Customer never sent a message
  if (!customer.lastInboundMessageAt || !customer.windowExpiresAt) {
    return {
      isActive: false,
      lastInboundMessageAt: null,
      windowExpiresAt: null,
      remainingTime: null,
      status: 'never_messaged'
    }
  }

  const now = new Date()
  const expiresAt = new Date(customer.windowExpiresAt)
  const isActive = now < expiresAt

  // Calculate remaining time
  let remainingTime = null
  if (isActive) {
    const totalSeconds = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    remainingTime = {
      hours,
      minutes,
      seconds,
      totalSeconds
    }
  }

  return {
    isActive,
    lastInboundMessageAt: customer.lastInboundMessageAt,
    windowExpiresAt: customer.windowExpiresAt,
    remainingTime,
    status: isActive ? 'active' : 'expired'
  }
}

/**
 * Format remaining time to human-readable string
 */
export function formatRemainingTime(remainingTime: WindowStatus['remainingTime']): string {
  if (!remainingTime) return 'Expired'

  const { hours, minutes } = remainingTime

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else {
    return 'Less than 1 minute'
  }
}

/**
 * Check if business can send free-form message (not template)
 */
export async function canSendFreeMessage(customerId: string): Promise<{
  allowed: boolean
  reason?: string
  windowStatus?: WindowStatus
}> {
  const windowStatus = await checkWindowStatus(customerId)

  if (windowStatus.status === 'never_messaged') {
    return {
      allowed: false,
      reason: 'Customer has never sent a message. Only template messages allowed.',
      windowStatus
    }
  }

  if (windowStatus.status === 'expired') {
    return {
      allowed: false,
      reason: `24-hour window expired at ${windowStatus.windowExpiresAt?.toISOString()}. Use message template.`,
      windowStatus
    }
  }

  return {
    allowed: true,
    windowStatus
  }
}

/**
 * Open or refresh 24-hour window when customer sends message
 */
export async function openMessageWindow(customerId: string): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24 hours

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      lastInboundMessageAt: now,
      windowExpiresAt: expiresAt,
      isWindowActive: true
    }
  })
}

/**
 * Close expired windows (run via cron job)
 */
export async function closeExpiredWindows(): Promise<number> {
  const now = new Date()

  const result = await prisma.customer.updateMany({
    where: {
      isWindowActive: true,
      windowExpiresAt: {
        lt: now
      }
    },
    data: {
      isWindowActive: false
    }
  })

  return result.count
}

/**
 * Get count of customers with active windows for a user
 */
export async function getActiveWindowsCount(userId: string): Promise<number> {
  const now = new Date()

  const count = await prisma.customer.count({
    where: {
      userId,
      isWindowActive: true,
      windowExpiresAt: {
        gt: now
      }
    }
  })

  return count
}

/**
 * Get customers with windows expiring soon (within specified minutes)
 */
export async function getExpiringWindows(
  userId: string,
  withinMinutes: number = 60
): Promise<Array<{
  id: string
  phoneNumber: string
  name: string | null
  windowExpiresAt: Date
}>> {
  const now = new Date()
  const threshold = new Date(now.getTime() + withinMinutes * 60 * 1000)

  const customers = await prisma.customer.findMany({
    where: {
      userId,
      isWindowActive: true,
      windowExpiresAt: {
        gt: now,
        lte: threshold
      }
    },
    select: {
      id: true,
      phoneNumber: true,
      name: true,
      windowExpiresAt: true
    },
    orderBy: {
      windowExpiresAt: 'asc'
    }
  })

  return customers as any
}
