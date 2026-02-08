import type { EmailTemplate } from '../types.js';

interface WebhookSubscriptionFailedParams {
  wabaId: string;
  businessName: string;
  error: string;
  attemptCount: number;
}

export const webhookSubscriptionFailedTemplate: EmailTemplate = (params: WebhookSubscriptionFailedParams) => {
  const { wabaId, businessName, error, attemptCount } = params;
  
  return {
    subject: `[CRITICAL] Webhook Subscription Failed - ${businessName} (${attemptCount} attempts)`,
    body: `
      <h2>WhatsApp Webhook Subscription Failed</h2>
      <p>The webhook subscription for a WhatsApp Business Account has failed multiple times.</p>
      
      <h3>Details:</h3>
      <ul>
        <li><strong>Business:</strong> ${businessName}</li>
        <li><strong>WABA ID:</strong> ${wabaId}</li>
        <li><strong>Error:</strong> ${error}</li>
        <li><strong>Failed Attempts:</strong> ${attemptCount}</li>
        <li><strong>Time:</strong> ${new Date().toISOString()}</li>
      </ul>
      
      <h3>Impact:</h3>
      <p>Without active webhook subscriptions, the system cannot:</p>
      <ul>
        <li>Receive incoming messages</li>
        <li>Track message delivery status</li>
        <li>Monitor template approval status</li>
      </ul>
      
      <h3>Action Required:</h3>
      <ol>
        <li>Check webhook URL configuration in Meta App Dashboard</li>
        <li>Verify webhook URL is accessible and has valid SSL certificate</li>
        <li>Check application logs for webhook verification errors</li>
        <li>Manually resubscribe webhooks if needed</li>
      </ol>
      
      <p>This requires immediate attention to restore full functionality.</p>
      
      <p>Best regards,<br>System Administrator</p>
    `
  };
};
