import { z } from "zod"

export const webhookEventTypes = [
  "message.received",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
] as const

export const webhookChannels = ["whatsapp", "instagram", "all"] as const

export const webhookEventSchema = z.enum(webhookEventTypes)
export const webhookChannelSchema = z.enum(webhookChannels)

export type WebhookEventType = z.infer<typeof webhookEventSchema>
export type WebhookChannel = z.infer<typeof webhookChannelSchema>

const webhookDeliveryLogSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventType: z.string(),
  responseStatus: z.number().nullable(),
  latencyMs: z.number().nullable(),
  attemptNumber: z.number(),
  status: z.string(),
  errorMessage: z.string().nullable(),
  createdAt: z.string(),
  nextRetryAt: z.string().nullable(),
})
export type WebhookDeliveryLog = z.infer<typeof webhookDeliveryLogSchema>

const webhookSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  secret: z.string().optional(),
  events: z.array(webhookEventSchema),
  channels: z.array(webhookChannelSchema),
  isActive: z.boolean(),
  failureCount: z.number(),
  lastFailedAt: z.string().nullable(),
  disabledAt: z.string().nullable(),
  disableReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Webhook = z.infer<typeof webhookSchema>

export const webhookListSchema = z.array(webhookSchema)
