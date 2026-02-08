"use client"

import { useState, useEffect, useCallback } from "react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"

// Types matching backend service interfaces
export interface RevenueStats {
  totalRevenue: number
  monthlyRevenue: number
  successfulTransactions: number
  pendingTransactions: number
}

export interface MonthlyRevenueData {
  month: string
  revenue: number
  count: number
}

export interface RevenueByTier {
  lite: {
    revenue: number
    count: number
    percentage: number
  }
  pro: {
    revenue: number
    count: number
    percentage: number
  }
}

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED" | "CANCELLED"
export type SubscriptionTier = "FREE" | "LITE" | "PRO"

export interface TransactionListItem {
  id: string
  orderId: string
  userId: string
  userName: string
  userEmail: string
  amount: number
  targetTier: SubscriptionTier
  status: PaymentStatus
  createdAt: string
  paidAt: string | null
}

export interface TransactionFilters {
  status?: PaymentStatus
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
}


export interface TransactionListResponse {
  transactions: TransactionListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Hook return types
interface UseRevenueStatsReturn {
  stats: RevenueStats | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseRevenueChartReturn {
  data: MonthlyRevenueData[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseRevenueByTierReturn {
  data: RevenueByTier | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

interface UseTransactionsReturn {
  transactions: TransactionListItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  } | null
  isLoading: boolean
  error: string | null
  filters: TransactionFilters
  setFilters: (filters: TransactionFilters) => void
  refetch: () => Promise<void>
}

/**
 * Hook for fetching revenue statistics
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export function useRevenueStats(): UseRevenueStatsReturn {
  const [stats, setStats] = useState<RevenueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/api/v1/admin/revenue/stats`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to access revenue statistics")
        }
        throw new Error("Failed to fetch revenue statistics")
      }

      const data = await response.json()

      if (data.success && data.data) {
        setStats(data.data)
      } else {
        throw new Error(data.error?.message || "Failed to fetch revenue statistics")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  }
}


/**
 * Hook for fetching monthly revenue chart data
 * Requirements: 2.1
 */
export function useRevenueChart(months: number = 12): UseRevenueChartReturn {
  const [data, setData] = useState<MonthlyRevenueData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/api/v1/admin/revenue/chart?months=${months}`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to access revenue chart data")
        }
        throw new Error("Failed to fetch revenue chart data")
      }

      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error?.message || "Failed to fetch revenue chart data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [months])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}

/**
 * Hook for fetching revenue breakdown by tier
 * Requirements: 6.1, 6.2
 */
export function useRevenueByTier(): UseRevenueByTierReturn {
  const [data, setData] = useState<RevenueByTier | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${API_URL}/api/v1/admin/revenue/by-tier`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to access tier breakdown data")
        }
        throw new Error("Failed to fetch tier breakdown data")
      }

      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
      } else {
        throw new Error(result.error?.message || "Failed to fetch tier breakdown data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  }
}


/**
 * Hook for fetching transactions with filtering, search, and pagination
 * Requirements: 3.1, 4.1, 4.2, 4.3, 5.1
 */
export function useTransactions(initialFilters: TransactionFilters = {}): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([])
  const [pagination, setPagination] = useState<{
    page: number
    limit: number
    total: number
    totalPages: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  })

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (filters.page) params.set("page", filters.page.toString())
      if (filters.limit) params.set("limit", filters.limit.toString())
      if (filters.status) params.set("status", filters.status)
      if (filters.startDate) params.set("startDate", filters.startDate)
      if (filters.endDate) params.set("endDate", filters.endDate)
      if (filters.search) params.set("search", filters.search)

      const response = await fetch(`${API_URL}/api/v1/admin/revenue/transactions?${params}`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("You don't have permission to access transactions")
        }
        if (response.status === 400) {
          const data = await response.json()
          throw new Error(data.error?.message || "Invalid filter parameters")
        }
        throw new Error("Failed to fetch transactions")
      }

      const result = await response.json()

      if (result.success && result.data) {
        setTransactions(result.data.transactions)
        setPagination({
          page: result.data.page,
          limit: result.data.limit,
          total: result.data.total,
          totalPages: result.data.totalPages,
        })
      } else {
        throw new Error(result.error?.message || "Failed to fetch transactions")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  return {
    transactions,
    pagination,
    isLoading,
    error,
    filters,
    setFilters,
    refetch: fetchTransactions,
  }
}

/**
 * Combined hook for fetching all revenue data at once
 * Useful for the main revenue dashboard page
 */
export function useAdminRevenue() {
  const stats = useRevenueStats()
  const chart = useRevenueChart()
  const tierBreakdown = useRevenueByTier()
  const transactionsData = useTransactions()

  const refetchAll = useCallback(async () => {
    await Promise.all([
      stats.refetch(),
      chart.refetch(),
      tierBreakdown.refetch(),
      transactionsData.refetch(),
    ])
  }, [stats, chart, tierBreakdown, transactionsData])

  return {
    stats,
    chart,
    tierBreakdown,
    transactions: transactionsData,
    refetchAll,
    isLoading: stats.isLoading || chart.isLoading || tierBreakdown.isLoading || transactionsData.isLoading,
  }
}
