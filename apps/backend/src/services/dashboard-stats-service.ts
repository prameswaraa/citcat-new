import { Prisma } from '@prisma/client'
import { prisma } from '../utils/database.js'
import { getActiveWindowsCount } from '../utils/messageWindow.js'

// Enhanced Stats Response Interface
export interface EnhancedDashboardStats {
  messages: {
    total: number
    today: number
    thisWeek: number
    thisMonth: number
    sent: number
    delivered: number
    read: number
    failed: number
    deliveryRate: number
    readRate: number
    byType: {
      text: number
      image: number
      video: number
      document: number
      template: number
      other: number
    }
    byChannel: {
      whatsapp: number
      instagram: number
    }
  }
  customers: {
    total: number
    newThisWeek: number
    activeWindows: number
    consented: number
    blacklisted: number
    byPipelineStage: Array<{
      stageId: string
      stageName: string
      stageColor: string
      count: number
    }>
    topLeads: Array<{
      id: string
      name: string
      phoneNumber: string
      leadScore: number
      pipelineStage: string | null
    }>
  }
  templates: {
    total: number
    approved: number
    pending: number
    rejected: number
    byCategory: {
      marketing: number
      utility: number
      authentication: number
    }
    usageThisMonth: number
  }
  whatsapp: {
    connected: boolean
    phoneNumber: string | null
    verifiedName: string | null
  }
  instagram: {
    connected: boolean
    conversations: number
    unreadCount: number
    activeWindows: number
    messagesTotal: number
  }
  quality: {
    rating: 'HIGH' | 'MEDIUM' | 'LOW' | null
    messagingTier: string | null
    blockCount7days: number
    spamReportCount7days: number
    status: string | null
  }
  lastUpdated: string
}

// Message Volume Response Interface
export interface MessageVolumeData {
  date: string
  whatsapp: number
  instagram: number
  total: number
}

// Customer Insights Response Interface
export interface CustomerInsights {
  byPipelineStage: Array<{
    stageId: string
    stageName: string
    stageColor: string
    count: number
  }>
  topLeads: Array<{
    id: string
    name: string
    phoneNumber: string
    leadScore: number
    pipelineStage: string | null
  }>
  newThisWeek: number
  consented: number
}

// Quality Metrics Response Interface
export interface QualityMetrics {
  rating: 'HIGH' | 'MEDIUM' | 'LOW' | null
  messagingTier: string | null
  blockCount7days: number
  spamReportCount7days: number
  status: string | null
}

export class DashboardStatsService {
  /**
   * Get comprehensive enhanced stats for user dashboard
   * Requirements: 1.1-1.5, 2.1-2.6, 3.1-3.4, 4.1-4.3, 5.1-5.4
   */
  static async getEnhancedStats(userId: string, whatsappPhoneNumberId?: string): Promise<EnhancedDashboardStats> {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Execute all queries in parallel for performance
    const [
      messageStats,
      messageTypeStats,
      customerStats,
      templateStats,
      templateCategoryStats,
      templateUsage,
      whatsappStatus,
      instagramStats,
      qualityRating,
      activeWindowsCount,
      customerInsights
    ] = await Promise.all([
      // Message stats with delivery/read rates
      this.getMessageStats(userId, startOfToday, oneWeekAgo, oneMonthAgo, whatsappPhoneNumberId),
      // Message type breakdown
      this.getMessageTypeStats(userId, whatsappPhoneNumberId),
      // Customer stats
      this.getCustomerStats(userId, oneWeekAgo, whatsappPhoneNumberId),
      // Template stats by status
      this.getTemplateStats(userId),
      // Template stats by category
      this.getTemplateCategoryStats(userId),
      // Template usage this month
      this.getTemplateUsageThisMonth(userId, oneMonthAgo, whatsappPhoneNumberId),
      // WhatsApp connection status
      this.getWhatsAppStatus(userId),
      // Instagram stats
      this.getInstagramStats(userId),
      // Quality rating
      this.getLatestQualityRating(userId),
      // Active windows count
      getActiveWindowsCount(userId),
      // Customer insights (pipeline + top leads)
      this.getCustomerInsights(userId, whatsappPhoneNumberId)
    ])

    return {
      messages: {
        ...messageStats,
        byType: messageTypeStats,
        byChannel: {
          whatsapp: messageStats.total - (instagramStats.messagesTotal || 0),
          instagram: instagramStats.messagesTotal || 0
        }
      },
      customers: {
        ...customerStats,
        activeWindows: activeWindowsCount,
        byPipelineStage: customerInsights.byPipelineStage,
        topLeads: customerInsights.topLeads
      },
      templates: {
        ...templateStats,
        byCategory: templateCategoryStats,
        usageThisMonth: templateUsage
      },
      whatsapp: whatsappStatus,
      instagram: instagramStats,
      quality: {
        rating: qualityRating?.rating || null,
        messagingTier: qualityRating?.messagingTier || null,
        blockCount7days: qualityRating?.blockCount7days || 0,
        spamReportCount7days: qualityRating?.spamReportCount7days || 0,
        status: qualityRating?.status || null
      },
      lastUpdated: now.toISOString()
    }
  }

  /**
   * Get message volume data for chart (last N days)
   * Requirements: 1.4, 3.1
   */
  static async getMessageVolume(userId: string, days: number = 30, whatsappPhoneNumberId?: string): Promise<MessageVolumeData[]> {
    const now = new Date()
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // Get WhatsApp messages grouped by date
    const whatsappMessages = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(timestamp) as date, COUNT(*) as count
      FROM "Message"
      WHERE "userId" = ${userId} AND timestamp >= ${startDate}
      ${whatsappPhoneNumberId ? Prisma.sql`AND "whatsappPhoneNumberId" = ${whatsappPhoneNumberId}` : Prisma.empty}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `

    // Get Instagram messages grouped by date
    const instagramMessages = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE(m."createdAt") as date, COUNT(*) as count
      FROM "IGMessage" m
      JOIN "IGConversation" c ON m."conversationId" = c.id
      JOIN "InstagramAccount" a ON c."instagramAccountId" = a.id
      WHERE a."userId" = ${userId} AND m."createdAt" >= ${startDate}
      GROUP BY DATE(m."createdAt")
      ORDER BY date ASC
    `

    // Create a map of all dates
    const volumeMap = new Map<string, { whatsapp: number; instagram: number }>()

    // Initialize all dates with 0
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      volumeMap.set(dateStr, { whatsapp: 0, instagram: 0 })
    }

    // Add WhatsApp message counts
    for (const row of whatsappMessages) {
      const dateStr = new Date(row.date).toISOString().split('T')[0]
      const current = volumeMap.get(dateStr)
      if (current) {
        current.whatsapp = Number(row.count)
      }
    }

    // Add Instagram message counts
    for (const row of instagramMessages) {
      const dateStr = new Date(row.date).toISOString().split('T')[0]
      const current = volumeMap.get(dateStr)
      if (current) {
        current.instagram = Number(row.count)
      }
    }

    // Convert map to array
    const result: MessageVolumeData[] = []
    for (const [date, counts] of volumeMap) {
      result.push({
        date,
        whatsapp: counts.whatsapp,
        instagram: counts.instagram,
        total: counts.whatsapp + counts.instagram
      })
    }

    return result.sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get customer insights (pipeline distribution + top leads)
   * Requirements: 2.4, 2.5
   */
  static async getCustomerInsights(userId: string, whatsappPhoneNumberId?: string): Promise<CustomerInsights> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Get pipeline stage distribution
    const pipelineDistribution = await prisma.$queryRaw<Array<{
      stageId: string
      stageName: string
      stageColor: string
      count: bigint
    }>>`
      SELECT
        ps.id as "stageId",
        ps.name as "stageName",
        ps.color as "stageColor",
        COUNT(c.id) as count
      FROM "PipelineStage" ps
      JOIN "Pipeline" p ON ps."pipelineId" = p.id
      LEFT JOIN "Customer" c ON c."pipelineStageId" = ps.id AND c."userId" = ${userId}
        ${whatsappPhoneNumberId ? Prisma.sql`AND c."whatsappPhoneNumberId" = ${whatsappPhoneNumberId}` : Prisma.empty}
      WHERE p."userId" = ${userId}
      GROUP BY ps.id, ps.name, ps.color, ps."order"
      ORDER BY ps."order" ASC
    `

    // Get top 5 leads by score
    const topLeads = await prisma.customer.findMany({
      where: {
        userId,
        ...(whatsappPhoneNumberId ? { whatsappPhoneNumberId } : {}),
      },
      orderBy: { leadScore: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        leadScore: true,
        pipelineStage: {
          select: { name: true }
        }
      }
    })

    // Get new customers this week
    const newThisWeek = await prisma.customer.count({
      where: {
        userId,
        ...(whatsappPhoneNumberId ? { whatsappPhoneNumberId } : {}),
        createdAt: { gte: oneWeekAgo }
      }
    })

    // Get consented customers
    const consented = await prisma.customer.count({
      where: {
        userId,
        ...(whatsappPhoneNumberId ? { whatsappPhoneNumberId } : {}),
        consentStatus: true
      }
    })

    return {
      byPipelineStage: pipelineDistribution.map(row => ({
        stageId: row.stageId,
        stageName: row.stageName,
        stageColor: row.stageColor,
        count: Number(row.count)
      })),
      topLeads: topLeads.map(lead => ({
        id: lead.id,
        name: lead.name || 'Unknown',
        phoneNumber: lead.phoneNumber,
        leadScore: lead.leadScore,
        pipelineStage: lead.pipelineStage?.name || null
      })),
      newThisWeek,
      consented
    }
  }

  /**
   * Get quality metrics for user
   * Requirements: 5.1, 5.2, 5.3, 5.4
   */
  static async getQualityMetrics(userId: string, whatsappPhoneNumberId?: string): Promise<QualityMetrics> {
    // Look up the specific PhoneNumber first to get Meta's phoneNumberId for QualityRating filtering
    const targetPhone = whatsappPhoneNumberId
      ? await prisma.phoneNumber.findUnique({
          where: { id: whatsappPhoneNumberId },
          select: { phoneNumberId: true, qualityRating: true, messagingLimitTier: true, whatsappAccountId: true }
        })
      : null

    const [qualityRating, waAccount, phoneNumber] = await Promise.all([
      prisma.qualityRating.findFirst({
        where: {
          userId,
          ...(targetPhone ? { phoneNumberId: targetPhone.phoneNumberId } : {}),
        },
        orderBy: { measuredAt: 'desc' }
      }),
      prisma.whatsAppAccount.findFirst({
        where: {
          userId,
          connectionStatus: 'connected',
          ...(targetPhone?.whatsappAccountId ? { id: targetPhone.whatsappAccountId } : {}),
        },
        select: { messagingTier: true }
      }),
      // Get quality from PhoneNumber table (from Meta API)
      targetPhone
        ? Promise.resolve({ qualityRating: targetPhone.qualityRating, messagingLimitTier: targetPhone.messagingLimitTier })
        : prisma.phoneNumber.findFirst({
            where: { userId, isPrimary: true },
            select: { qualityRating: true, messagingLimitTier: true }
          })
    ])

    // If we have QualityRating data, use it
    if (qualityRating) {
      return {
        rating: qualityRating.rating,
        messagingTier: waAccount?.messagingTier || phoneNumber?.messagingLimitTier || null,
        blockCount7days: qualityRating.blockCount7days,
        spamReportCount7days: qualityRating.spamReportCount7days,
        status: qualityRating.status
      }
    }

    // Fallback: convert PhoneNumber qualityRating (GREEN/YELLOW/RED) to dashboard format (HIGH/MEDIUM/LOW)
    if (phoneNumber?.qualityRating) {
      const ratingMap: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
        'GREEN': 'HIGH',
        'YELLOW': 'MEDIUM',
        'RED': 'LOW'
      }
      return {
        rating: ratingMap[phoneNumber.qualityRating] || null,
        messagingTier: waAccount?.messagingTier || phoneNumber.messagingLimitTier || null,
        blockCount7days: 0,
        spamReportCount7days: 0,
        status: 'CONNECTED'
      }
    }

    return {
      rating: null,
      messagingTier: waAccount?.messagingTier || null,
      blockCount7days: 0,
      spamReportCount7days: 0,
      status: null
    }
  }

  // Private helper methods

  private static async getMessageStats(
    userId: string,
    startOfToday: Date,
    oneWeekAgo: Date,
    oneMonthAgo: Date,
    whatsappPhoneNumberId?: string
  ) {
    const stats = await prisma.$queryRaw<Array<{
      total: bigint
      today: bigint
      thisWeek: bigint
      thisMonth: bigint
      sent: bigint
      delivered: bigint
      read: bigint
      failed: bigint
    }>>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE timestamp >= ${startOfToday}) as today,
        COUNT(*) FILTER (WHERE timestamp >= ${oneWeekAgo}) as "thisWeek",
        COUNT(*) FILTER (WHERE timestamp >= ${oneMonthAgo}) as "thisMonth",
        COUNT(*) FILTER (WHERE direction = 'OUTBOUND') as sent,
        COUNT(*) FILTER (WHERE direction = 'OUTBOUND' AND status = 'DELIVERED') as delivered,
        COUNT(*) FILTER (WHERE direction = 'OUTBOUND' AND status = 'READ') as read,
        COUNT(*) FILTER (WHERE direction = 'OUTBOUND' AND status = 'FAILED') as failed
      FROM "Message"
      WHERE "userId" = ${userId}
      ${whatsappPhoneNumberId ? Prisma.sql`AND "whatsappPhoneNumberId" = ${whatsappPhoneNumberId}` : Prisma.empty}
    `

    const row = stats[0]
    const sent = Number(row.sent)
    const delivered = Number(row.delivered)
    const read = Number(row.read)

    return {
      total: Number(row.total),
      today: Number(row.today),
      thisWeek: Number(row.thisWeek),
      thisMonth: Number(row.thisMonth),
      sent,
      delivered,
      read,
      failed: Number(row.failed),
      deliveryRate: sent > 0 ? Math.round((delivered / sent) * 100 * 10) / 10 : 0,
      readRate: delivered > 0 ? Math.round((read / delivered) * 100 * 10) / 10 : 0
    }
  }

  private static async getMessageTypeStats(userId: string, whatsappPhoneNumberId?: string) {
    const stats = await prisma.$queryRaw<Array<{
      text: bigint
      image: bigint
      video: bigint
      document: bigint
      template: bigint
      other: bigint
    }>>`
      SELECT
        COUNT(*) FILTER (WHERE "messageType" = 'TEXT') as text,
        COUNT(*) FILTER (WHERE "messageType" = 'IMAGE') as image,
        COUNT(*) FILTER (WHERE "messageType" = 'VIDEO') as video,
        COUNT(*) FILTER (WHERE "messageType" = 'DOCUMENT') as document,
        COUNT(*) FILTER (WHERE "messageType" = 'TEMPLATE') as template,
        COUNT(*) FILTER (WHERE "messageType" NOT IN ('TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT', 'TEMPLATE')) as other
      FROM "Message"
      WHERE "userId" = ${userId}
      ${whatsappPhoneNumberId ? Prisma.sql`AND "whatsappPhoneNumberId" = ${whatsappPhoneNumberId}` : Prisma.empty}
    `

    const row = stats[0]
    return {
      text: Number(row.text),
      image: Number(row.image),
      video: Number(row.video),
      document: Number(row.document),
      template: Number(row.template),
      other: Number(row.other)
    }
  }

  private static async getCustomerStats(userId: string, oneWeekAgo: Date, whatsappPhoneNumberId?: string) {
    const stats = await prisma.$queryRaw<Array<{
      total: bigint
      newThisWeek: bigint
      consented: bigint
      blacklisted: bigint
    }>>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "createdAt" >= ${oneWeekAgo}) as "newThisWeek",
        COUNT(*) FILTER (WHERE "consentStatus" = true) as consented,
        COUNT(*) FILTER (WHERE blacklisted = true) as blacklisted
      FROM "Customer"
      WHERE "userId" = ${userId}
      ${whatsappPhoneNumberId ? Prisma.sql`AND "whatsappPhoneNumberId" = ${whatsappPhoneNumberId}` : Prisma.empty}
    `

    const row = stats[0]
    return {
      total: Number(row.total),
      newThisWeek: Number(row.newThisWeek),
      consented: Number(row.consented),
      blacklisted: Number(row.blacklisted)
    }
  }

  private static async getTemplateStats(userId: string) {
    const stats = await prisma.$queryRaw<Array<{
      total: bigint
      approved: bigint
      pending: bigint
      rejected: bigint
    }>>`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected
      FROM "MessageTemplate"
      WHERE "userId" = ${userId}
    `

    const row = stats[0]
    return {
      total: Number(row.total),
      approved: Number(row.approved),
      pending: Number(row.pending),
      rejected: Number(row.rejected)
    }
  }

  private static async getTemplateCategoryStats(userId: string) {
    const stats = await prisma.$queryRaw<Array<{
      marketing: bigint
      utility: bigint
      authentication: bigint
    }>>`
      SELECT
        COUNT(*) FILTER (WHERE category = 'MARKETING') as marketing,
        COUNT(*) FILTER (WHERE category = 'UTILITY') as utility,
        COUNT(*) FILTER (WHERE category = 'AUTHENTICATION') as authentication
      FROM "MessageTemplate"
      WHERE "userId" = ${userId}
    `

    const row = stats[0]
    return {
      marketing: Number(row.marketing),
      utility: Number(row.utility),
      authentication: Number(row.authentication)
    }
  }

  private static async getTemplateUsageThisMonth(userId: string, oneMonthAgo: Date, whatsappPhoneNumberId?: string) {
    const count = await prisma.message.count({
      where: {
        userId,
        messageType: 'TEMPLATE',
        timestamp: { gte: oneMonthAgo },
        ...(whatsappPhoneNumberId ? { whatsappPhoneNumberId } : {}),
      }
    })
    return count
  }

  private static async getInstagramStats(userId: string) {
    // Check if user has Instagram connected
    const instagramAccount = await prisma.instagramAccount.findFirst({
      where: { userId, connectionStatus: 'connected' }
    })

    if (!instagramAccount) {
      return {
        connected: false,
        conversations: 0,
        unreadCount: 0,
        activeWindows: 0,
        messagesTotal: 0
      }
    }

    const [conversationStats, messageCount] = await Promise.all([
      prisma.$queryRaw<Array<{
        total: bigint
        unread: bigint
        activeWindows: bigint
      }>>`
        SELECT
          COUNT(*) as total,
          SUM("unreadCount") as unread,
          COUNT(*) FILTER (WHERE "isWindowActive" = true) as "activeWindows"
        FROM "IGConversation"
        WHERE "instagramAccountId" = ${instagramAccount.id}
      `,
      prisma.iGMessage.count({
        where: {
          conversation: {
            instagramAccountId: instagramAccount.id
          }
        }
      })
    ])

    const row = conversationStats[0]
    return {
      connected: true,
      conversations: Number(row.total),
      unreadCount: Number(row.unread || 0),
      activeWindows: Number(row.activeWindows),
      messagesTotal: messageCount
    }
  }

  private static async getLatestQualityRating(userId: string) {
    const [qualityRating, waAccount, phoneNumber] = await Promise.all([
      prisma.qualityRating.findFirst({
        where: { userId },
        orderBy: { measuredAt: 'desc' }
      }),
      prisma.whatsAppAccount.findFirst({
        where: { userId, connectionStatus: 'connected' },
        select: { messagingTier: true }
      }),
      // Fallback: get quality from PhoneNumber table (from Meta API)
      prisma.phoneNumber.findFirst({
        where: { userId, isPrimary: true },
        select: { qualityRating: true, messagingLimitTier: true }
      })
    ])

    // If we have QualityRating data, use it
    if (qualityRating) {
      return {
        rating: qualityRating.rating,
        messagingTier: waAccount?.messagingTier || phoneNumber?.messagingLimitTier || null,
        blockCount7days: qualityRating.blockCount7days,
        spamReportCount7days: qualityRating.spamReportCount7days,
        status: qualityRating.status
      }
    }

    // Fallback: convert PhoneNumber qualityRating (GREEN/YELLOW/RED) to dashboard format (HIGH/MEDIUM/LOW)
    if (phoneNumber?.qualityRating) {
      const ratingMap: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
        'GREEN': 'HIGH',
        'YELLOW': 'MEDIUM',
        'RED': 'LOW'
      }
      return {
        rating: ratingMap[phoneNumber.qualityRating] || null,
        messagingTier: waAccount?.messagingTier || phoneNumber.messagingLimitTier || null,
        blockCount7days: 0,
        spamReportCount7days: 0,
        status: 'CONNECTED'
      }
    }

    return null
  }

  private static async getWhatsAppStatus(userId: string) {
    // Check if user has WhatsApp connected via WhatsAppAccount
    const [waAccount, phoneNumber] = await Promise.all([
      prisma.whatsAppAccount.findFirst({
        where: { userId, connectionStatus: 'connected' },
        select: { id: true }
      }),
      // Get any phone number for this user
      prisma.phoneNumber.findFirst({
        where: { userId },
        orderBy: { isPrimary: 'desc' },
        select: {
          displayPhoneNumber: true,
          verifiedName: true,
        }
      })
    ])

    return {
      connected: !!waAccount,
      phoneNumber: phoneNumber?.displayPhoneNumber || null,
      verifiedName: phoneNumber?.verifiedName || null,
    }
  }
}
