'use client'

import { useCallback, type ReactNode, type ComponentProps } from 'react'
import { Link } from '@/i18n/routing'
import { usePrefetch, type PrefetchType } from '@/hooks/use-prefetch'

interface PrefetchLinkProps extends Omit<ComponentProps<typeof Link>, 'href'> {
  href: string
  children: ReactNode
  /**
   * Type of data to prefetch on hover
   * - dashboard: Prefetch dashboard stats
   * - templates: Prefetch templates list
   * - customers: Prefetch customers list
   */
  prefetchType?: PrefetchType
  className?: string
}

/**
 * Link component with data prefetching on hover
 * 
 * Wraps Next.js Link with onMouseEnter prefetch functionality.
 * Prefetch operations are non-blocking and silently handle errors.
 * 
 * Requirements: 7.1, 7.3, 7.4
 * 
 * @example
 * <PrefetchLink href="/dashboard" prefetchType="dashboard">
 *   Dashboard
 * </PrefetchLink>
 */
export function PrefetchLink({
  href,
  children,
  prefetchType,
  className,
  onMouseEnter,
  ...props
}: PrefetchLinkProps) {
  const { prefetchDashboard, prefetchTemplates, prefetchCustomers } = usePrefetch()

  const handleMouseEnter = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      // Call original onMouseEnter if provided
      onMouseEnter?.(event)

      // Trigger prefetch based on type (non-blocking)
      switch (prefetchType) {
        case 'dashboard':
          void prefetchDashboard()
          break
        case 'templates':
          void prefetchTemplates()
          break
        case 'customers':
          void prefetchCustomers()
          break
      }
    },
    [prefetchType, prefetchDashboard, prefetchTemplates, prefetchCustomers, onMouseEnter]
  )

  return (
    <Link
      href={href}
      onMouseEnter={handleMouseEnter}
      className={className}
      {...props}
    >
      {children}
    </Link>
  )
}
