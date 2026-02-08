/**
 * useSubscription Hook
 * Fetches current subscription data and pricing information with duration options
 * Uses TanStack Query for caching and background refetching
 *
 * Requirements: 1.1, 2.1, 2.6, 5.1, 5.2
 */

import { useQueryClient } from '@tanstack/react-query'
import {
  useSubscriptionStatus,
  usePricing,
  invalidateSubscriptionCache,
} from '@/hooks/use-subscription-query'
import type {
  SubscriptionData as BaseSubscriptionData,
  PricingData,
  PricingDataWithDurations,
  SubscriptionTier,
  SubscriptionStatus,
} from '@/lib/api/subscription-api'

// Re-export types for backward compatibility
export type { SubscriptionTier, SubscriptionStatus }

// Local subscription data type for this page
export interface SubscriptionData {
  tier: SubscriptionTier
  status: SubscriptionStatus
  startDate: string | null
  endDate: string | null
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

// Re-export pricing types
export type { PricingData, PricingDataWithDurations }

interface UseSubscriptionReturn {
  subscription: SubscriptionData | null
  pricing: PricingData | null
  pricingWithDurations: PricingDataWithDurations | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

// Default subscription for fallback
const defaultSubscription: SubscriptionData = {
  tier: 'FREE',
  status: 'ACTIVE',
  startDate: null,
  endDate: null,
}

export function useSubscription(): UseSubscriptionReturn {
  const queryClient = useQueryClient()

  // Use TanStack Query hooks for subscription status
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
    refetch: refetchSubscription,
  } = useSubscriptionStatus()

  // Use TanStack Query hooks for pricing
  const {
    data: pricingData,
    isLoading: pricingLoading,
    error: pricingError,
    refetch: refetchPricing,
  } = usePricing()

  // Transform subscription data to local format
  const subscription: SubscriptionData | null = subscriptionData
    ? {
        tier: subscriptionData.tier,
        status: subscriptionData.status,
        startDate: null,
        endDate: subscriptionData.expiresAt,
      }
    : subscriptionLoading
      ? null
      : defaultSubscription

  // Extract pricing data
  const pricing = pricingData?.pricing ?? null
  const pricingWithDurations = pricingData?.pricingWithDurations ?? null

  // Combined loading state
  const loading = subscriptionLoading || pricingLoading

  // Combined error state
  const error = subscriptionError
    ? (subscriptionError as Error).message
    : pricingError
      ? (pricingError as Error).message
      : null

  // Refetch function that invalidates cache and refetches
  const refetch = async () => {
    invalidateSubscriptionCache(queryClient)
    await Promise.all([refetchSubscription(), refetchPricing()])
  }

  return {
    subscription,
    pricing,
    pricingWithDurations,
    loading,
    error,
    refetch,
  }
}
