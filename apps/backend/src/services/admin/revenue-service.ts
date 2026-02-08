import { prisma } from '../../utils/database.js'
import type { PaymentStatus, SubscriptionTier } from '@prisma/client'

// Response interfaces
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

export interface TransactionListItem {
  id: string
  orderId: string
  userId: string
  userName: string
  userEmail: string
  amount: number
  targetTier: SubscriptionTier
  status: PaymentStatus
  createdAt: Date
  paidAt: Date | null
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


export class AdminRevenueService {
  /**
   * Get revenue statistics
   * Requirements: 1.1, 1.2, 1.3, 1.4
   */
  static async getRevenueStats(): Promise<RevenueStats> {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalRevenueResult, monthlyRevenueResult, successfulThisMonth, pendingCount] =
      await Promise.all([
        // Total revenue from all COMPLETED transactions
        prisma.paymentTransaction.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { amount: true }
        }),
        // Revenue for current month
        prisma.paymentTransaction.aggregate({
          where: {
            status: 'COMPLETED',
            paidAt: { gte: startOfMonth }
          },
          _sum: { amount: true }
        }),
        // Count of successful transactions this month
        prisma.paymentTransaction.count({
          where: {
            status: 'COMPLETED',
            paidAt: { gte: startOfMonth }
          }
        }),
        // Count of pending transactions
        prisma.paymentTransaction.count({
          where: { status: 'PENDING' }
        })
      ])

    return {
      totalRevenue: totalRevenueResult._sum.amount || 0,
      monthlyRevenue: monthlyRevenueResult._sum.amount || 0,
      successfulTransactions: successfulThisMonth,
      pendingTransactions: pendingCount
    }
  }

  /**
   * Get monthly revenue data for chart
   * Requirements: 2.1
   */
  static async getMonthlyRevenue(months: number = 12): Promise<MonthlyRevenueData[]> {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    // Get all completed transactions in the date range
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: startDate }
      },
      select: {
        amount: true,
        paidAt: true
      }
    })

    // Group by month
    const monthlyData = new Map<string, { revenue: number; count: number }>()

    // Initialize all months with zero values
    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyData.set(monthKey, { revenue: 0, count: 0 })
    }

    // Aggregate transaction data
    for (const tx of transactions) {
      if (tx.paidAt) {
        const monthKey = `${tx.paidAt.getFullYear()}-${String(tx.paidAt.getMonth() + 1).padStart(2, '0')}`
        const existing = monthlyData.get(monthKey)
        if (existing) {
          existing.revenue += tx.amount
          existing.count += 1
        }
      }
    }

    // Convert to array and sort by month
    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        count: data.count
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  /**
   * Get revenue breakdown by subscription tier
   * Requirements: 6.1, 6.2, 6.3
   */
  static async getRevenueByTier(): Promise<RevenueByTier> {
    const [liteResult, proResult] = await Promise.all([
      prisma.paymentTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          targetTier: 'LITE'
        },
        _sum: { amount: true },
        _count: true
      }),
      prisma.paymentTransaction.aggregate({
        where: {
          status: 'COMPLETED',
          targetTier: 'PRO'
        },
        _sum: { amount: true },
        _count: true
      })
    ])

    const liteRevenue = liteResult._sum.amount || 0
    const proRevenue = proResult._sum.amount || 0
    const totalRevenue = liteRevenue + proRevenue

    return {
      lite: {
        revenue: liteRevenue,
        count: liteResult._count,
        percentage: totalRevenue > 0 ? Math.round((liteRevenue / totalRevenue) * 100) : 0
      },
      pro: {
        revenue: proRevenue,
        count: proResult._count,
        percentage: totalRevenue > 0 ? Math.round((proRevenue / totalRevenue) * 100) : 0
      }
    }
  }

  /**
   * Get paginated list of transactions with filtering and search
   * Requirements: 3.1, 3.3, 3.4, 4.1, 4.2, 4.3, 5.1
   */
  static async getTransactions(filters: TransactionFilters): Promise<TransactionListResponse> {
    const { status, startDate, endDate, search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    if (search) {
      where.OR = [
        { orderId: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const [transactions, total] = await Promise.all([
      prisma.paymentTransaction.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.paymentTransaction.count({ where })
    ])

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        orderId: tx.orderId,
        userId: tx.userId,
        userName: tx.user.name,
        userEmail: tx.user.email,
        amount: tx.amount,
        targetTier: tx.targetTier,
        status: tx.status,
        createdAt: tx.createdAt,
        paidAt: tx.paidAt
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }
}
