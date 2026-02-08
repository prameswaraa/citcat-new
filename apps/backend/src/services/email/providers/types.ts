/**
 * Email Provider Interface and Types
 * 
 * Provider-agnostic email service abstraction that supports
 * any SMTP provider (Brevo, SendGrid, Mailgun, AWS SES, etc.)
 */

/**
 * Options for sending an email
 */
export interface EmailSendOptions {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML content of the email */
  html: string;
  /** Plain text content (optional fallback) */
  text?: string;
  /** Reply-to email address (optional) */
  replyTo?: string;
}

/**
 * Result of an email send operation
 */
export interface EmailSendResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Message ID from the provider (if available) */
  messageId?: string;
  /** Error message if sending failed */
  error?: string;
}

/**
 * Configuration for SMTP provider
 */
export interface SMTPConfig {
  /** SMTP server hostname */
  host: string;
  /** SMTP server port */
  port: number;
  /** SMTP username/login */
  user: string;
  /** SMTP password */
  password: string;
  /** Sender email address */
  fromEmail: string;
  /** Sender display name */
  fromName: string;
  /** Use TLS/SSL (true for port 465) */
  secure?: boolean;
}

/**
 * Email provider interface
 * 
 * All email providers must implement this interface
 */
export interface EmailProvider {
  /** Provider name for logging/identification */
  readonly name: string;
  
  /**
   * Send an email
   * @param options - Email send options
   * @returns Result of the send operation
   */
  send(options: EmailSendOptions): Promise<EmailSendResult>;
  
  /**
   * Check if the provider is properly configured
   * @returns true if all required configuration is present
   */
  isConfigured(): boolean;
}
