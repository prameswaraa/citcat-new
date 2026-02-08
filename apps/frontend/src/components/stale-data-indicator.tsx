/**
 * Stale Data Indicator Component
 *
 * Displays a subtle indicator when cached data is being refreshed in the background.
 * Used to inform users that they're seeing cached data while fresh data is loading.
 *
 * Requirements: 9.2, 9.3
 */

'use client'

import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StaleDataIndicatorProps {
  /**
   * Whether the data is currently stale
   */
  isStale?: boolean
  /**
   * Whether a background fetch is in progress
   */
  isFetching?: boolean
  /**
   * Custom class name for styling
   */
  className?: string
  /**
   * Custom text to display (default: "Updating...")
   */
  text?: string
  /**
   * Whether to show the indicator (combines isStale && isFetching if not provided)
   */
  show?: boolean
}

/**
 * StaleDataIndicator - Shows when cached data is being refreshed
 *
 * Only displays when:
 * - show prop is true, OR
 * - isStale AND isFetching are both true
 *
 * This provides visual feedback that the user is seeing cached data
 * while fresh data is being fetched in the background.
 */
export function StaleDataIndicator({
  isStale = false,
  isFetching = false,
  className,
  text = 'Updating...',
  show,
}: StaleDataIndicatorProps) {
  // Determine if indicator should be shown
  const shouldShow = show !== undefined ? show : isStale && isFetching

  if (!shouldShow) {
    return null
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}

/**
 * Compact version of StaleDataIndicator
 * Shows only the spinning icon without text
 */
export function StaleDataIndicatorCompact({
  isStale = false,
  isFetching = false,
  className,
  show,
}: Omit<StaleDataIndicatorProps, 'text'>) {
  const shouldShow = show !== undefined ? show : isStale && isFetching

  if (!shouldShow) {
    return null
  }

  return (
    <RefreshCw
      className={cn('h-3 w-3 animate-spin text-muted-foreground', className)}
      role="status"
      aria-label="Updating data"
    />
  )
}

export default StaleDataIndicator
