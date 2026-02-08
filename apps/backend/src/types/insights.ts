/**
 * WhatsApp Insights Type Definitions
 * 
 * Defines interfaces for Meta Graph API analytics endpoints,
 * request parameters, and service interfaces.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */

// =============================================================================
// Granularity and Category Types
// =============================================================================

// User-facing granularity type (unified for simplicity)
export type Granularity = 'HALF_HOUR' | 'DAY' | 'MONTH';

// Meta API granularity for message analytics endpoint
// Endpoint: analytics - uses DAY, MONTH
export type MessageAnalyticsGranularity = 'HALF_HOUR' | 'DAY' | 'MONTH';

// Meta API granularity for conversation_analytics endpoint
// Endpoint: conversation_analytics - uses DAILY, MONTHLY
export type ConversationAnalyticsGranularity = 'HALF_HOUR' | 'DAILY' | 'MONTHLY';

/**
 * Convert user-facing granularity to conversation analytics granularity
 * analytics uses: HALF_HOUR, DAY, MONTH
 * conversation_analytics uses: HALF_HOUR, DAILY, MONTHLY
 */
export function toConversationGranularity(granularity: Granularity): ConversationAnalyticsGranularity {
  switch (granularity) {
    case 'DAY':
      return 'DAILY';
    case 'MONTH':
      return 'MONTHLY';
    default:
      return granularity;
  }
}

export type ConversationCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE';

export type ConversationType = 'FREE_ENTRY_POINT' | 'FREE_TIER' | 'REGULAR';

export type ConversationDirection = 'BUSINESS_INITIATED' | 'USER_INITIATED';

// =============================================================================
// Request Parameter Interfaces
// =============================================================================

/**
 * Parameters for message analytics request
 * Requirements: 1.1, 1.2, 1.5
 */
export interface MessageAnalyticsParams {
  wabaId: string;
  startDate: number; // Unix timestamp in seconds
  endDate: number; // Unix timestamp in seconds
  granularity: Granularity;
  phoneNumbers?: string[]; // Optional filter by phone numbers
}

/**
 * Parameters for conversation analytics request
 * Requirements: 2.1, 2.4, 2.5
 */
export interface ConversationAnalyticsParams {
  wabaId: string;
  startDate: number; // Unix timestamp in seconds
  endDate: number; // Unix timestamp in seconds
  granularity: Granularity;
  phoneNumbers?: string[];
  conversationCategories?: ConversationCategory[];
  conversationTypes?: ConversationType[];
  conversationDirections?: ConversationDirection[];
}

/**
 * Parameters for template performance metrics request
 * Requirements: 3.1
 */
export interface TemplatePerformanceParams {
  wabaId: string;
  startDate: number; // Unix timestamp in seconds
  endDate: number; // Unix timestamp in seconds
  templateIds?: string[];
}

/**
 * Parameters for insights overview request
 */
export interface InsightsOverviewParams {
  wabaId: string;
  startDate: number;
  endDate: number;
  granularity: Granularity;
  phoneNumbers?: string[];
}

// =============================================================================
// Meta Graph API Response Types
// =============================================================================

/**
 * Data point from Meta analytics endpoint
 */
export interface AnalyticsDataPoint {
  start: number;
  end: number;
  sent: number;
  delivered: number;
}

/**
 * Message analytics response from Meta Graph API
 * Endpoint: /{waba_id}?fields=analytics.start(X).end(Y).granularity(Z)
 */
export interface MetaMessageAnalyticsResponse {
  analytics: {
    phone_numbers: string[];
    country_codes: string[];
    granularity: string;
    data_points: AnalyticsDataPoint[];
  };
  id: string;
}

/**
 * Conversation data point from Meta API
 */
export interface ConversationDataPoint {
  start: number;
  end: number;
  conversation: number;
  phone_number: string;
  country: string;
  conversation_type: string;
  conversation_direction: string;
  conversation_category: string;
  cost: number;
}

/**
 * Conversation analytics response from Meta Graph API
 * Endpoint: /{waba_id}?fields=conversation_analytics.start(X).end(Y).granularity(Z)
 */
export interface MetaConversationAnalyticsResponse {
  conversation_analytics: {
    data: Array<{
      data_points: ConversationDataPoint[];
    }>;
  };
  id: string;
}

/**
 * Template analytics data point from Meta API
 * Per Meta docs (analitik.md), the response format is:
 * {
 *   data: [{
 *     granularity: "DAILY",
 *     product_type: "cloud_api",
 *     data_points: [{
 *       template_id: "123",
 *       start: 1718064000,
 *       end: 1718150400,
 *       sent: 1,
 *       delivered: 1,
 *       read: 1,
 *       clicked: [{ type: "url_button", button_content: "...", count: 10 }],
 *       cost: [{ type: "amount_spent", value: 0.01 }]
 *     }]
 *   }]
 * }
 */
export interface TemplateAnalyticsDataPoint {
  template_id: string;
  start: number;
  end: number;
  sent?: number;
  delivered?: number;
  read?: number;
  clicked?: Array<{
    type: string;
    button_content?: string;
    count: number;
  }>;
  cost?: Array<{
    type: string;
    value: number;
  }>;
}

/**
 * Template analytics data from Meta API (legacy format, kept for compatibility)
 */
export interface TemplateAnalyticsData {
  sent: number;
  delivered: number;
  read: number;
  clicked?: number; // For CTA templates
  replied?: number;
}

/**
 * Template performance response from Meta Graph API
 * Endpoint: /{waba_id}/template_analytics
 */
export interface MetaTemplatePerformanceResponse {
  data: Array<{
    granularity?: string;
    product_type?: string;
    data_points?: TemplateAnalyticsDataPoint[];
    // Legacy format support
    template_id?: string;
    analytics?: TemplateAnalyticsData;
  }>;
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
  };
}

// =============================================================================
// Service Response Types
// =============================================================================

/**
 * Processed message analytics data
 */
export interface MessageAnalyticsData {
  phoneNumbers: string[];
  countryCodes: string[];
  granularity: Granularity;
  dataPoints: Array<{
    start: number;
    end: number;
    sent: number;
    delivered: number;
  }>;
  totals: {
    sent: number;
    delivered: number;
    deliveryRate: number;
  };
}

/**
 * Processed conversation analytics data
 */
export interface ConversationAnalyticsData {
  dataPoints: Array<{
    start: number;
    end: number;
    conversation: number;
    phoneNumber: string;
    country: string;
    conversationType: string;
    conversationDirection: string;
    conversationCategory: string;
    cost: number;
  }>;
  totals: {
    totalConversations: number;
    totalCost: number;
    byCategory: {
      marketing: number;
      utility: number;
      authentication: number;
      service: number;
    };
    costByCategory: {
      marketing: number;
      utility: number;
      authentication: number;
      service: number;
    };
  };
}

/**
 * Processed template performance data
 */
export interface TemplatePerformanceData {
  templates: Array<{
    templateId: string;
    templateName?: string;
    sent: number;
    delivered: number;
    read: number;
    clicked?: number;
    replied?: number;
    deliveryRate: number;
    readRate: number;
    clickRate?: number;
  }>;
}

/**
 * Combined insights overview data
 */
export interface InsightsOverviewData {
  messages: {
    totalSent: number;
    totalDelivered: number;
    deliveryRate: number;
  };
  conversations: {
    total: number;
    estimatedCost: number;
    byCategory: {
      marketing: number;
      utility: number;
      authentication: number;
      service: number;
    };
  };
  period: {
    start: number;
    end: number;
    granularity: Granularity;
  };
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface InsightsApiResponse<T> {
  success: boolean;
  data: T;
  cached?: boolean;
  error?: InsightsError;
}

/**
 * Insights error response
 * Requirements: 1.4, 2.5, 3.3, 7.4
 */
export interface InsightsError {
  code: InsightsErrorCode;
  message: string;
  details?: {
    metaErrorCode?: number;
    metaErrorSubcode?: number;
    metaErrorMessage?: string;
    retryAfter?: number; // For rate limiting
  };
}

export type InsightsErrorCode = 
  | 'NO_WABA_CONNECTED'
  | 'META_API_ERROR'
  | 'RATE_LIMITED'
  | 'REGION_RESTRICTED'
  | 'UNAUTHORIZED'
  | 'INVALID_PARAMS'
  | 'TEMPLATE_INSIGHTS_NOT_ENABLED';

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Insights service interface
 * Requirements: 6.1, 6.2, 6.3
 */
export interface IInsightsService {
  getMessageAnalytics(params: MessageAnalyticsParams): Promise<MessageAnalyticsData>;
  getConversationAnalytics(params: ConversationAnalyticsParams): Promise<ConversationAnalyticsData>;
  getTemplatePerformance(params: TemplatePerformanceParams): Promise<TemplatePerformanceData>;
  getInsightsOverview(params: InsightsOverviewParams): Promise<InsightsOverviewData>;
}

// =============================================================================
// Cache Configuration
// =============================================================================

/**
 * Cache configuration for insights data
 * Requirements: 7.1, 7.2
 */
export const INSIGHTS_CACHE_CONFIG = {
  messageAnalytics: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'insights:messages',
  },
  conversationAnalytics: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'insights:conversations',
  },
  templatePerformance: {
    ttl: 10 * 60 * 1000, // 10 minutes (less frequently updated)
    keyPrefix: 'insights:templates',
  },
  overview: {
    ttl: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'insights:overview',
  },
} as const;

/**
 * Generate cache key for insights data
 */
export function generateInsightsCacheKey(
  type: keyof typeof INSIGHTS_CACHE_CONFIG,
  wabaId: string,
  params: Record<string, unknown>
): string {
  const config = INSIGHTS_CACHE_CONFIG[type];
  const paramsHash = JSON.stringify(params);
  return `${config.keyPrefix}:${wabaId}:${Buffer.from(paramsHash).toString('base64').slice(0, 32)}`;
}
