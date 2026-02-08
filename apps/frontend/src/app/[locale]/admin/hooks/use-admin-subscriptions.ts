"use client"

import { useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"

export interface SubscriptionStats {
  byTier: {
    FREE: number
    LITE: number
    PRO: number
  }
  byStatus: {
    ACTIVE: number
    PENDING_PAYMENT: number
    EXPIRED: number
    CANCELLED: number
  }
  total: number
}

export interface PendingPayment {
  id: string
  userId: string
  userName: string
  userEmail: string
  tier: string
  paymentProof: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpiringSubscription {
  id: string
  userId: string
  userName: string
  userEmail: string
  tier: string
  status: string
  endDate: string
  daysUntilExpiry: number
}

interface UseAdminSubscriptionsReturn {
  stats: SubscriptionStats | null
  pendingPayments: PendingPayment[]
  expiringSubscriptions: ExpiringSubscription[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  approvePayment: (userId: string, notes?: string) => Promise<boolean>
}

export function useAdminSubscriptions(): UseAdminSubscriptionsReturn {
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [expiringSubscriptions, setExpiringSubscriptions] = useState<ExpiringSubscription[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [statsRes, pendingRes, expiringRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/admin/subscriptions/stats`, { credentials: "include" }),
        fetch(`${API_URL}/api/v1/admin/subscriptions/pending`, { credentials: "include" }),
        fetch(`${API_URL}/api/v1/admin/subscriptions/expiring?days=30`, { credentials: "include" }),
      ])

      if (!statsRes.ok || !pendingRes.ok || !expiringRes.ok) {
        if (statsRes.status === 403 || pendingRes.status === 403 || expiringRes.status === 403) {
          throw new Error("You don't have permission to access subscription data")
        }
        throw new Error("Failed to fetch subscription data")
      }

      const [statsData, pendingData, expiringData] = await Promise.all([
        statsRes.json(),
        pendingRes.json(),
        expiringRes.json(),
      ])

      if (statsData.success) setStats(statsData.data)
      if (pendingData.success) setPendingPayments(pendingData.data)
      if (expiringData.success) setExpiringSubscriptions(expiringData.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const approvePayment = useCallback(async (userId: string, notes?: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/subscriptions/users/${userId}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || "Failed to approve payment")
      }

      await fetchData()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve payment")
      return false
    }
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    stats,
    pendingPayments,
    expiringSubscriptions,
    isLoading,
    error,
    refetch: fetchData,
    approvePayment,
  }
}
