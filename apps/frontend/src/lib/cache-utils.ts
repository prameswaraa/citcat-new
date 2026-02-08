/**
 * Cache Invalidation Utilities
 *
 * Provides helper functions for invalidating query caches after mutations
 * and clearing all cache on logout.
 *
 * Usage:
 * - invalidateOnMessageSent(queryClient) - after sending a message
 * - invalidateOnTemplateChange(queryClient) - after template CRUD
 * - invalidateOnCustomerChange(queryClient) - after customer CRUD
 * - invalidateOnPaymentComplete(queryClient) - after payment success
 * - clearAllCacheOnLogout(queryClient) - on user logout
 */

import { QueryClient } from '@tanstack/react-query'
import { queryKeys } from './query-keys'

/**
 * Invalidate caches after a message is sent
 * - Dashboard stats (message counts changed)
 * - Message volume chart
 * - Messages list
 */
export function invalidateOnMessageSent(queryClient: QueryClient): void {
  // Invalidate dashboard stats (message counts changed)
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
  // Invalidate all dashboard queries (includes message volume)
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
  // Invalidate messages list
  queryClient.invalidateQueries({ queryKey: queryKeys.messages.all })
}

/**
 * Invalidate caches after template changes (create, update, delete)
 * - All template queries
 * - Dashboard stats (template counts)
 */
export function invalidateOnTemplateChange(queryClient: QueryClient): void {
  // Invalidate all template queries
  queryClient.invalidateQueries({ queryKey: queryKeys.templates.all })
  // Also invalidate dashboard (template counts)
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
}

/**
 * Invalidate caches after customer changes (create, update, delete)
 * - All customer queries
 * - Dashboard stats (customer counts)
 */
export function invalidateOnCustomerChange(queryClient: QueryClient): void {
  // Invalidate all customer queries
  queryClient.invalidateQueries({ queryKey: queryKeys.customers.all })
  // Also invalidate dashboard (customer counts)
  queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
}

/**
 * Invalidate caches after payment is completed
 * - All subscription queries (status changed)
 */
export function invalidateOnPaymentComplete(queryClient: QueryClient): void {
  // Invalidate all subscription queries
  queryClient.invalidateQueries({ queryKey: queryKeys.subscription.all })
}

/**
 * Clear all cached data on logout
 * Ensures no data leakage between user sessions
 */
export function clearAllCacheOnLogout(queryClient: QueryClient): void {
  queryClient.clear()
}
