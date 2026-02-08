import { Context } from 'hono'
import { prisma } from '../utils/database.js'
import { PLAN_LIMITS } from '../config/plans.js'
import { SubscriptionTier, SubscriptionStatus } from '@prisma/client'

// Type definitions for feature checking
export type BooleanFeature = 'aiChatbot' | 'apiAccess' | 'webhooksEnabled'
export type NumericLimit = 'maxKnowledgeDocs' | 'maxAgents' | 'maxApiKeys' | 'maxWebhookEndpoints'

// Inactive subscription statuses that should be treated as FREE tier
const INACTIVE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.EXPIRED,
  SubscriptionStatus.CANCELLED,
  SubscriptionStatus.PENDING_PAYMENT
]

interface SubscriptionData {
  tier: SubscriptionTier
  status: SubscriptionStatus
  endDate: Date | null
}

/**
 * Get subscription data for a user
 * No caching - subscription data must always be fresh for accurate billing/feature access
 */
export async function getSubscription(userId: string): Promise<SubscriptionData> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId }
  })

  if (!subscription) {
    // Default to FREE if no subscription record exists
    return {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      endDate: null
    }
  }

  return {
    tier: subscription.tier,
    status: subscription.status,
    endDate: subscription.endDate
  }
}


/**
 * Get the effective tier for a user, treating inactive subscriptions as FREE
 */
function getEffectiveTier(subscription: SubscriptionData): SubscriptionTier {
  if (INACTIVE_STATUSES.includes(subscription.status)) {
    return SubscriptionTier.FREE
  }
  return subscription.tier
}

/**
 * Find the minimum tier required for a feature
 */
function getRequiredTierForFeature(feature: BooleanFeature): SubscriptionTier {
  // Check tiers in order from lowest to highest
  const tiers: SubscriptionTier[] = [SubscriptionTier.FREE, SubscriptionTier.LITE, SubscriptionTier.PRO]
  
  for (const tier of tiers) {
    if (PLAN_LIMITS[tier][feature] === true) {
      return tier
    }
  }
  
  return SubscriptionTier.PRO // Default to highest tier if not found
}

export async function checkFeatureAccess(userId: string, feature: BooleanFeature) {
  const subscription = await getSubscription(userId)
  const effectiveTier = getEffectiveTier(subscription)
  const limits = PLAN_LIMITS[effectiveTier]
  
  return limits[feature] === true
}

export async function checkUsageLimit(
  userId: string, 
  resource: NumericLimit
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const subscription = await getSubscription(userId)
  const effectiveTier = getEffectiveTier(subscription)
  const limit = PLAN_LIMITS[effectiveTier][resource]
  
  let current = 0
  
  switch (resource) {
    case 'maxKnowledgeDocs':
      current = await prisma.knowledgeDocument.count({
        where: { userId }
      })
      break
    case 'maxAgents':
      current = await prisma.aIAgent.count({
        where: { userId }
      })
      break
    case 'maxApiKeys':
      current = await prisma.apiKey.count({
        where: { 
          userId,
          revokedAt: null // Only count active (non-revoked) keys
        }
      })
      break
    case 'maxWebhookEndpoints':
      current = await prisma.webhookEndpoint.count({
        where: { userId }
      })
      break
  }

  return {
    allowed: current < limit,
    limit,
    current
  }
}


export function requireFeature(feature: BooleanFeature) {
  return async (c: Context, next: () => Promise<void>) => {
    if (!c.user) {
      return c.json({ error: { code: 'Unauthorized', message: 'Authentication required' } }, 401)
    }

    const subscription = await getSubscription(c.user.id)
    const effectiveTier = getEffectiveTier(subscription)
    const hasAccess = PLAN_LIMITS[effectiveTier][feature] === true

    if (!hasAccess) {
      const requiredTier = getRequiredTierForFeature(feature)
      
      return c.json({ 
        error: { 
          code: 'SubscriptionRequired', 
          message: `This feature requires a ${requiredTier} or higher subscription.`,
          requiredTier,
          currentTier: effectiveTier,
          upgradeUrl: '/settings/billing'
        } 
      }, 403)
    }

    await next()
  }
}

/**
 * Invalidate subscription cache for a user
 * No-op since caching was removed - kept for backward compatibility with callers
 */
export async function invalidateSubscriptionCache(_userId: string): Promise<void> {
  // No-op: caching removed to ensure subscription changes reflect immediately
}
