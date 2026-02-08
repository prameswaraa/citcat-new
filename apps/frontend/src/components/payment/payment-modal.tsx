'use client'

/**
 * Payment Modal Component - Simplified
 * 
 * Flow:
 * 1. Modal opens → show loading
 * 2. Create Xendit Invoice → get paymentUrl
 * 3. Redirect to Xendit payment page
 * 4. User pays on Xendit → callback updates subscription
 * 
 * No method selection needed - Xendit handles all payment methods.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { invalidateSubscriptionCache } from '@/hooks/use-subscription-query'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

// Types
export type SubscriptionTier = 'BASIC' | 'LITE' | 'PRO'
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED'

type ModalStep = 'loading' | 'success' | 'error' | 'expired'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  targetTier: SubscriptionTier
  durationMonths: number
  onSuccess: () => void
  tierPrice?: number
}

interface PaymentData {
  orderId: string
  paymentUrl: string
  amount: number
  expiresAt: string
  subscriptionEndDate?: string
}

// Format price to IDR
function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Format date to locale string
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function PaymentModal({
  isOpen,
  onClose,
  targetTier,
  durationMonths,
  onSuccess,
  tierPrice = 0,
}: PaymentModalProps) {
  const t = useTranslations('payment')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<ModalStep>('loading')
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const hasCreatedPayment = useRef(false)

  // Create payment and redirect
  const createPaymentAndRedirect = useCallback(async () => {
    setStep('loading')
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/v1/payment/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          targetTier, 
          durationMonths, 
          paymentMethod: 'QRIS', // Default, Xendit will show all options
          locale, // Pass locale for correct redirect
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || t('failedToCreatePayment'))
      }

      // Calculate subscription end date
      const subscriptionEndDate = new Date()
      subscriptionEndDate.setDate(subscriptionEndDate.getDate() + (durationMonths === 12 ? 365 : durationMonths * 30))

      // Must have paymentUrl from Xendit Invoice
      if (!result.data.paymentUrl) {
        throw new Error('Payment URL not received')
      }

      setPaymentData({
        orderId: result.data.orderId,
        paymentUrl: result.data.paymentUrl,
        amount: result.data.amount,
        expiresAt: result.data.expiresAt,
        subscriptionEndDate: subscriptionEndDate.toISOString(),
      })

      // Redirect to Xendit payment page
      window.location.href = result.data.paymentUrl

    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreatePayment'))
      setStep('error')
    }
  }, [targetTier, durationMonths, locale, t])

  // Handle close
  const handleClose = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    onClose()
  }, [onClose])

  // Auto-create payment when modal opens
  useEffect(() => {
    if (isOpen && !hasCreatedPayment.current) {
      hasCreatedPayment.current = true
      setStep('loading')
      setPaymentData(null)
      setError(null)
      createPaymentAndRedirect()
    } else if (!isOpen) {
      hasCreatedPayment.current = false
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [isOpen, createPaymentAndRedirect])

  // Handle success completion
  const handleSuccessClose = useCallback(() => {
    invalidateSubscriptionCache(queryClient)
    onSuccess()
    handleClose()
  }, [queryClient, onSuccess, handleClose])

  // Handle retry
  const handleRetry = () => {
    hasCreatedPayment.current = false
    setPaymentData(null)
    setError(null)
    createPaymentAndRedirect()
  }

  // Get duration label
  const getDurationLabel = (months: number): string => {
    switch (months) {
      case 1: return t('duration1Month')
      case 3: return t('duration3Months')
      case 6: return t('duration6Months')
      case 12: return t('duration12Months')
      default: return `${months} ${t('duration1Month').split(' ')[1]}`
    }
  }

  // Render loading step
  const renderLoading = () => (
    <>
      <DialogHeader>
        <DialogTitle>
          {t('processingPayment')} - {getDurationLabel(durationMonths)}
        </DialogTitle>
        <DialogDescription>
          {t('upgradeTo', { tier: targetTier })} - {formatPrice(tierPrice)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center py-8 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {t('redirectingToPayment')}
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={handleClose}>
          {tCommon('cancel')}
        </Button>
      </DialogFooter>
    </>
  )

  // Render success state
  const renderSuccess = () => (
    <>
      <DialogHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>
        <DialogTitle>{t('paymentSuccess')}</DialogTitle>
        <DialogDescription>{t('paymentSuccessDesc', { tier: targetTier })}</DialogDescription>
      </DialogHeader>

      <div className="py-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t('premiumActivated')}</p>
        {paymentData?.subscriptionEndDate && (
          <p className="text-sm font-medium">
            {t('subscriptionValidUntil', { date: formatDate(paymentData.subscriptionEndDate) })}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSuccessClose} className="w-full">
          {tCommon('done')}
        </Button>
      </DialogFooter>
    </>
  )

  // Render error state
  const renderError = () => (
    <>
      <DialogHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
          <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
        </div>
        <DialogTitle>{t('paymentFailedTitle')}</DialogTitle>
        <DialogDescription>{error || t('paymentFailedDesc')}</DialogDescription>
      </DialogHeader>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={handleClose}>
          {tCommon('close')}
        </Button>
        <Button onClick={handleRetry}>{t('tryAgain')}</Button>
      </DialogFooter>
    </>
  )

  // Render expired state
  const renderExpired = () => (
    <>
      <DialogHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
          <AlertCircle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <DialogTitle>{t('paymentExpired')}</DialogTitle>
        <DialogDescription>{t('paymentExpiredDesc')}</DialogDescription>
      </DialogHeader>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={handleClose}>
          {tCommon('close')}
        </Button>
        <Button onClick={handleRetry}>{t('createNewTransaction')}</Button>
      </DialogFooter>
    </>
  )

  // Render content based on step
  const renderContent = () => {
    switch (step) {
      case 'loading': return renderLoading()
      case 'success': return renderSuccess()
      case 'error': return renderError()
      case 'expired': return renderExpired()
      default: return renderLoading()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">{renderContent()}</DialogContent>
    </Dialog>
  )
}
