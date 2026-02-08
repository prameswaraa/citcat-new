/**
 * Email notification types
 */
export type EmailNotificationType = 
  | 'token_refresh_failed'
  | 'quality_rating_dropped'
  | 'webhook_subscription_failed'
  | 'waba_disconnected'
  | 'webhook_endpoint_disabled'
  | 'api_key_expiring';

/**
 * Email notification data
 */
export interface EmailNotificationData {
  type: EmailNotificationType;
  recipient: string;
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

/**
 * Email template function type
 */
export type EmailTemplate = (params: any) => {
  subject: string;
  body: string;
};
