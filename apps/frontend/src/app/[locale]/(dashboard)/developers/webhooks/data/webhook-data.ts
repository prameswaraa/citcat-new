// This file is kept for backwards compatibility but is no longer used.
// Webhook data is now fetched from the API via webhooksApi in @/lib/api/webhooks-api.ts

export const webhookEvents = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
] as const
