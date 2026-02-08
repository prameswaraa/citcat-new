/**
 * Error Handling Utilities for TanStack Query
 *
 * Provides utilities for handling query errors gracefully,
 * including stale data indicators and error fallback strategies.
 *
 * Requirements: 9.2, 9.3
 */

import { QueryClient } from '@tanstack/react-query'

/**
 * Default placeholder data function that returns previous data on error
 * This ensures cached data is shown when a query fails
 *
 * Usage in query hooks:
 * placeholderData: keepPreviousData
 */
export function keepPreviousData<T>(previousData: T | undefined): T | undefined {
  return previousData
}

/**
 * Check if a query has cached data available
 *
 * @param queryClient - The query client instance
 * @param queryKey - The query key to check
 * @returns true if cached data exists
 */
export function hasCachedData(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): boolean {
  const data = queryClient.getQueryData(queryKey)
  return data !== undefined
}

/**
 * Get cached data for a query key
 *
 * @param queryClient - The query client instance
 * @param queryKey - The query key to get data for
 * @returns The cached data or undefined
 */
export function getCachedData<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[]
): T | undefined {
  return queryClient.getQueryData<T>(queryKey)
}

/**
 * Determine if error state should be shown
 * Error state should only show when no cached data exists
 *
 * @param isError - Whether the query is in error state
 * @param data - The current data (may be from cache)
 * @returns true if error state should be displayed
 */
export function shouldShowError<T>(isError: boolean, data: T | undefined): boolean {
  return isError && data === undefined
}

/**
 * Determine if stale data indicator should be shown
 * Shows when data is stale and currently fetching in background
 *
 * @param isStale - Whether the data is stale
 * @param isFetching - Whether a background fetch is in progress
 * @returns true if stale indicator should be displayed
 */
export function shouldShowStaleIndicator(isStale: boolean, isFetching: boolean): boolean {
  return isStale && isFetching
}

/**
 * Error types for categorizing query errors
 */
export type QueryErrorType = 'network' | 'server' | 'auth' | 'unknown'

/**
 * Categorize an error for appropriate handling
 *
 * @param error - The error to categorize
 * @returns The error type category
 */
export function categorizeError(error: Error | null): QueryErrorType {
  if (!error) return 'unknown'

  const message = error.message.toLowerCase()

  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network'
  }

  if (message.includes('401') || message.includes('unauthorized') || message.includes('auth')) {
    return 'auth'
  }

  if (message.includes('500') || message.includes('server')) {
    return 'server'
  }

  return 'unknown'
}

/**
 * Get user-friendly error message based on error type
 *
 * @param errorType - The categorized error type
 * @returns A user-friendly error message
 */
export function getErrorMessage(errorType: QueryErrorType): string {
  switch (errorType) {
    case 'network':
      return 'Unable to connect. Please check your internet connection.'
    case 'auth':
      return 'Your session has expired. Please log in again.'
    case 'server':
      return 'Server error. Please try again later.'
    default:
      return 'Something went wrong. Please try again.'
  }
}


/**
 * Query error state interface
 * Provides all information needed to handle query errors in UI
 */
export interface QueryErrorState<T> {
  /**
   * Whether to show error UI (only when no cached data)
   */
  showError: boolean
  /**
   * Whether to show stale data indicator
   */
  showStaleIndicator: boolean
  /**
   * The categorized error type
   */
  errorType: QueryErrorType
  /**
   * User-friendly error message
   */
  errorMessage: string
  /**
   * Whether data is available (from cache or fresh)
   */
  hasData: boolean
}

/**
 * Get comprehensive error state for a query
 * Useful for determining what UI to show based on query state
 *
 * @param options - Query state options
 * @returns QueryErrorState with all error handling information
 */
export function getQueryErrorState<T>(options: {
  isError: boolean
  error: Error | null
  data: T | undefined
  isStale: boolean
  isFetching: boolean
}): QueryErrorState<T> {
  const { isError, error, data, isStale, isFetching } = options
  const hasData = data !== undefined
  const errorType = categorizeError(error)

  return {
    showError: shouldShowError(isError, data),
    showStaleIndicator: shouldShowStaleIndicator(isStale, isFetching),
    errorType,
    errorMessage: getErrorMessage(errorType),
    hasData,
  }
}
