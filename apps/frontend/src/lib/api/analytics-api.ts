const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

export interface AnalyticsData {
    overview: {
        totalMessages: number
        sentMessages: number
        deliveredMessages: number
        failedMessages: number
        totalCustomers: number
        activeCustomers: number
        totalTemplates: number
        approvedTemplates: number
        inboundMessages: number
        outboundMessages: number
        totalDeals: number
    }
    trends: {
        messagesGrowth: number
        customersGrowth: number
        deliveryRate: number
        responseRate: number
    }
    messageBreakdown: {
        inbound: number
        outbound: number
        inboundRate: string | number
    }
    crmMetrics: {
        totalDeals: number
        dealsByStage: Array<{
            name: string
            count: number
            color: string
        }>
        leadScoreDistribution: {
            low: number
            medium: number
            high: number
        }
    }
    messagesByDay: Array<{
        date: string
        count: number
    }>
    templatePerformance: Array<{
        templateName: string
        sent: number
        delivered: number
        deliveryRate: number
    }>
}

export const analyticsApi = {
    async getAnalytics(timeRange: string = '7d') {
        const response = await fetch(
            `${API_URL}/api/v1/analytics?timeRange=${timeRange}`,
            { credentials: 'include' }
        )
        const result = await response.json()
        if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to fetch analytics')
        }
        return result.data as AnalyticsData
    },
}
