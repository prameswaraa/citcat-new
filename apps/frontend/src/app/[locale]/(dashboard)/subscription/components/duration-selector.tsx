'use client'

/**
 * DurationSelector Component
 * Displays duration options as a clean grid with pricing info
 * Requirements: 1.1, 1.3, 1.4
 */

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

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

interface DurationSelectorProps {
  durations: DurationOption[]
  selectedMonths: number
  onSelect: (months: number) => void
  disabled?: boolean
}

// Format price to IDR compact
function formatPriceCompact(price: number): string {
  if (price >= 1000000) {
    return `${(price / 1000000).toFixed(1).replace('.0', '')}jt`
  }
  return `${(price / 1000).toFixed(0)}rb`
}

export function DurationSelector({
  durations,
  selectedMonths,
  onSelect,
  disabled = false,
}: DurationSelectorProps) {
  const t = useTranslations('subscription')

  if (!durations || durations.length === 0) {
    return null
  }

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {durations.map((duration) => {
        const isSelected = selectedMonths === duration.months
        const hasDiscount = duration.discountPercent > 0
        const isRecommended = duration.recommended || duration.months === 6

        return (
          <button
            key={duration.months}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(duration.months)}
            className={cn(
              'relative flex flex-col items-center rounded-lg p-2 text-center transition-all',
              'border-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background hover:border-primary/50 hover:bg-muted/30',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {/* Recommended badge */}
            {isRecommended && !isSelected && (
              <Badge 
                variant="secondary" 
                className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 whitespace-nowrap"
              >
                {t('recommended')}
              </Badge>
            )}
            
            {/* Duration label */}
            <span className={cn(
              'text-sm font-semibold',
              isSelected ? 'text-primary' : 'text-foreground'
            )}>
              {duration.months}
            </span>
            <span className={cn(
              'text-[10px]',
              isSelected ? 'text-primary' : 'text-muted-foreground'
            )}>
              {t('monthShort')}
            </span>
            
            {/* Price */}
            <span className={cn(
              'text-[10px] mt-1',
              isSelected ? 'text-primary font-medium' : 'text-muted-foreground'
            )}>
              {formatPriceCompact(duration.totalPrice)}
            </span>
            
            {/* Discount badge */}
            {hasDiscount && (
              <span className={cn(
                'text-[9px] font-semibold mt-0.5',
                isSelected 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-green-600 dark:text-green-500'
              )}>
                -{duration.discountPercent}%
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
