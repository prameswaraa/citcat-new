/**
 * Query Keys Factory
 *
 * Hierarchical query key structure for TanStack Query caching.
 * Keys are organized by domain and support granular invalidation.
 *
 * Usage:
 * - queryKeys.dashboard.all - invalidates all dashboard queries
 * - queryKeys.dashboard.stats() - specific dashboard stats query
 * - queryKeys.templates.list({ page: 1 }) - templates list with filters
 */

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    messageVolume: (days: number, phoneNumberId?: string) =>
      [...queryKeys.dashboard.all, 'message-volume', { days, phoneNumberId: phoneNumberId || 'all' }] as const,
    customerInsights: (phoneNumberId?: string) =>
      [...queryKeys.dashboard.all, 'customer-insights', phoneNumberId || 'all'] as const,
    qualityMetrics: (phoneNumberId?: string) =>
      [...queryKeys.dashboard.all, 'quality-metrics', phoneNumberId || 'all'] as const,
  },

  // Templates
  templates: {
    all: ['templates'] as const,
    lists: () => [...queryKeys.templates.all, 'list'] as const,
    list: (filters: { page?: number; search?: string; whatsappAccountId?: string }) =>
      [...queryKeys.templates.lists(), filters] as const,
    details: () => [...queryKeys.templates.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.templates.details(), id] as const,
  },

  // Customers
  customers: {
    all: ['customers'] as const,
    stats: (filters?: { whatsappPhoneNumberId?: string }) => 
      [...queryKeys.customers.all, 'stats', filters || {}] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: {
      page?: number
      search?: string
      pipeline?: string
      whatsappPhoneNumberId?: string
    }) => [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },

  // Subscription
  subscription: {
    all: ['subscription'] as const,
    status: () => [...queryKeys.subscription.all, 'status'] as const,
    pricing: () => [...queryKeys.subscription.all, 'pricing'] as const,
  },

  // Insights
  insights: {
    all: ['insights'] as const,
    byDateRange: (startDate: string, endDate: string, wabaAccountId?: string) =>
      [...queryKeys.insights.all, { startDate, endDate, wabaAccountId: wabaAccountId || 'all' }] as const,
  },

  // Team
  team: {
    all: ['team'] as const,
    members: () => [...queryKeys.team.all, 'members'] as const,
    invitations: () => [...queryKeys.team.all, 'invitations'] as const,
  },

  // Messages
  messages: {
    all: ['messages'] as const,
    lists: () => [...queryKeys.messages.all, 'list'] as const,
    list: (filters: { customerId?: string }) =>
      [...queryKeys.messages.lists(), filters] as const,
    conversation: (customerId: string) =>
      [...queryKeys.messages.all, 'conversation', customerId] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    list: (filters: { unreadOnly?: boolean; limit?: number; offset?: number }) =>
      [...queryKeys.notifications.lists(), filters] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unreadCount'] as const,
  },

  // Auto Tagging
  autoTagging: {
    all: ['autoTagging'] as const,
    rules: () => [...queryKeys.autoTagging.all, 'rules'] as const,
    rule: (id: string) => [...queryKeys.autoTagging.all, 'rule', id] as const,
  },
} as const

// Type exports for type-safe query key usage
export type QueryKeys = typeof queryKeys
export type DashboardKeys = typeof queryKeys.dashboard
export type TemplatesKeys = typeof queryKeys.templates
export type CustomersKeys = typeof queryKeys.customers
export type SubscriptionKeys = typeof queryKeys.subscription
export type InsightsKeys = typeof queryKeys.insights
export type TeamKeys = typeof queryKeys.team
export type MessagesKeys = typeof queryKeys.messages
export type NotificationsKeys = typeof queryKeys.notifications
export type AutoTaggingKeys = typeof queryKeys.autoTagging
