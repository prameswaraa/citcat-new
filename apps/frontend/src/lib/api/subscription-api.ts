const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

export type SubscriptionTier = 'FREE' | 'BASIC' | 'LITE' | 'PRO'
export type SubscriptionStatus = 'ACTIVE' | 'PENDING_PAYMENT' | 'EXPIRED' | 'CANCELLED'

export interface SubscriptionFeatures {
  aiChatbot: boolean
  apiAccess: boolean
  webhooksEnabled: boolean
}

export interface SubscriptionLimits {
  maxKnowledgeDocs: number
  maxAgents: number
  maxApiKeys: number
  maxWebhookEndpoints: number
}

export interface SubscriptionUsage {
  knowledgeDocs: number
  agents: number
  apiKeys: number
  webhookEndpoints: number
}

export interface SubscriptionData {
  tier: SubscriptionTier
  status: SubscriptionStatus
  expiresAt: string | null
  features: SubscriptionFeatures
  limits: SubscriptionLimits
  usage: SubscriptionUsage
}

// Duration option from pricing API
export interface DurationOption {
  months: number
  days: number
  discountPercent: number
  totalPrice: number
  effectiveMonthlyPrice: number
  savings: number
  label: string
  recommended?: boolean
}

// Legacy TierPricing for backward compatibility
export interface TierPricing {
  tier: SubscriptionTier
  price: number
  currency: string
  period: string
  features: string[]
}

// New pricing structure with durations
export interface TierPricingWithDurations {
  tier: SubscriptionTier
  name: string
  basePrice: number
  currency: string
  features: string[]
  durations: DurationOption[]
}

// Legacy PricingData for backward compatibility
export interface PricingData {
  basic: TierPricing
  lite: TierPricing
  pro: TierPricing
}

// New pricing data with durations
export interface PricingDataWithDurations {
  basic: TierPricingWithDurations
  lite: TierPricingWithDurations
  pro: TierPricingWithDurations
}

// Convert new pricing format to legacy format for backward compatibility
function convertToLegacyPricing(data: PricingDataWithDurations): PricingData {
  const getMonthlyPrice = (tier: TierPricingWithDurations): number => {
    const monthlyDuration = tier.durations.find((d) => d.months === 1)
    return monthlyDuration?.totalPrice || tier.basePrice
  }

  return {
    basic: {
      tier: 'BASIC',
      price: getMonthlyPrice(data.basic),
      currency: data.basic.currency,
      period: 'month',
      features: data.basic.features,
    },
    lite: {
      tier: 'LITE',
      price: getMonthlyPrice(data.lite),
      currency: data.lite.currency,
      period: 'month',
      features: data.lite.features,
    },
    pro: {
      tier: 'PRO',
      price: getMonthlyPrice(data.pro),
      currency: data.pro.currency,
      period: 'month',
      features: data.pro.features,
    },
  }
}

export const subscriptionApi = {
  async get(): Promise<SubscriptionData> {
    const response = await fetch(`${API_URL}/api/v1/subscription`, {
      method: 'GET',
      credentials: 'include',
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch subscription')
    }

    return result.data
  },

  async getPricing(): Promise<{
    pricing: PricingData
    pricingWithDurations: PricingDataWithDurations
  }> {
    const response = await fetch(`${API_URL}/api/v1/payment/pricing`, {
      method: 'GET',
      credentials: 'include',
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch pricing')
    }

    const pricingWithDurations = result.data as PricingDataWithDurations
    const pricing = convertToLegacyPricing(pricingWithDurations)

    return { pricing, pricingWithDurations }
  },
}
