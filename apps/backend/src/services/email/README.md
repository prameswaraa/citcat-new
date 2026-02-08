# Email Service

Modular email notification service for WABA events.

## Structure

```
email/
├── EmailService.ts          # Main email service class
├── types.ts                 # TypeScript types and interfaces
├── templates/               # Email templates
│   ├── index.ts            # Template exports
│   ├── tokenRefreshFailed.ts
│   ├── qualityRatingDrop.ts
│   ├── webhookSubscriptionFailed.ts
│   └── wabaDisconnected.ts
├── index.ts                 # Public exports
└── README.md               # This file
```

## Usage

### Import the service

```typescript
import { emailService } from '@/services/email';
```

### Send notifications

```typescript
// Token refresh failure
await emailService.sendTokenRefreshFailure(
  wabaId,
  businessName,
  error,
  adminEmail
);

// Quality rating drop
await emailService.sendQualityRatingDrop(
  phoneNumber,
  oldRating,
  newRating,
  businessName,
  adminEmail
);

// Webhook subscription failure
await emailService.sendWebhookSubscriptionFailure(
  wabaId,
  businessName,
  error,
  attemptCount
);

// WABA disconnected
await emailService.sendWABADisconnected(
  wabaId,
  businessName,
  reason,
  adminEmail
);
```

## Adding New Templates

1. Create a new template file in `templates/`:

```typescript
// templates/newTemplate.ts
import type { EmailTemplate } from '../types.js';

interface NewTemplateParams {
  param1: string;
  param2: string;
}

export const newTemplate: EmailTemplate = (params: NewTemplateParams) => {
  const { param1, param2 } = params;
  
  return {
    subject: `Subject with ${param1}`,
    body: `
      <h2>Email Title</h2>
      <p>Email content with ${param2}</p>
    `
  };
};
```

2. Export it in `templates/index.ts`:

```typescript
export { newTemplate } from './newTemplate.js';
```

3. Add method to `EmailService.ts`:

```typescript
async sendNewNotification(param1: string, param2: string, email: string) {
  const { subject, body } = newTemplate({ param1, param2 });
  
  await this.sendNotification({
    type: 'new_notification_type',
    recipient: email,
    subject,
    body,
    metadata: { param1, param2 },
  });
}
```

4. Update `types.ts` to include new notification type:

```typescript
export type EmailNotificationType = 
  | 'token_refresh_failed'
  | 'quality_rating_dropped'
  | 'webhook_subscription_failed'
  | 'waba_disconnected'
  | 'new_notification_type'; // Add here
```

## Configuration

Set environment variables:

```env
EMAIL_NOTIFICATIONS_ENABLED=true
EMAIL_FROM=noreply@kirim.chat
ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

## Email Provider Integration

Currently, emails are logged to console. To integrate with a real email provider:

1. Install provider SDK (e.g., `@sendgrid/mail`, `aws-sdk`, `resend`)
2. Update `sendNotification()` method in `EmailService.ts`
3. Replace the TODO comment with actual email sending logic

### Example with SendGrid:

```typescript
import sgMail from '@sendgrid/mail';

constructor() {
  // ... existing code
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
}

async sendNotification(data: EmailNotificationData): Promise<void> {
  if (!this.enabled) return;

  try {
    await sgMail.send({
      from: this.fromEmail,
      to: data.recipient,
      subject: data.subject,
      html: data.body,
    });
    
    logger.info('Email sent successfully', { type: data.type });
  } catch (error) {
    logger.error('Failed to send email', { error });
  }
}
```

## Testing

Test email templates:

```typescript
import { tokenRefreshFailedTemplate } from './templates';

const { subject, body } = tokenRefreshFailedTemplate({
  wabaId: 'test-waba-id',
  businessName: 'Test Business',
  error: 'Token expired'
});

console.log(subject);
console.log(body);
```

## Benefits of Modular Structure

- ✅ **Separation of Concerns**: Templates separated from service logic
- ✅ **Easy to Test**: Each template can be tested independently
- ✅ **Maintainable**: Easy to update email content without touching service code
- ✅ **Scalable**: Simple to add new notification types
- ✅ **Type-Safe**: Full TypeScript support with proper types
- ✅ **Reusable**: Templates can be used in different contexts
