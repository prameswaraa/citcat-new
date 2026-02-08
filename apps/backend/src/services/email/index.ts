export { EmailService, emailService } from './EmailService.js';
export type { EmailNotificationData, EmailNotificationType, EmailTemplate } from './types.js';
export type { 
  EmailProvider, 
  EmailSendOptions, 
  EmailSendResult, 
  SMTPConfig 
} from './providers/types.js';
export { SMTPProvider, createSMTPProviderFromEnv } from './providers/smtp-provider.js';
