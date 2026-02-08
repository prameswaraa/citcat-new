import { z } from "zod"

// WhatsApp Customer Schema
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneNumber: z.string(), // WhatsApp phone number (E.164 format)
  email: z.string().email().optional().nullable(),
  consentStatus: z.union([
    z.literal("CONSENTED"),
    z.literal("NOT_CONSENTED"),
    z.literal("REVOKED"),
  ]),
  consentDate: z.coerce.date().optional().nullable(),
  hasActiveWindow: z.boolean(), // 24-hour message window
  windowExpiresAt: z.coerce.date().optional().nullable(),
  lastMessageAt: z.coerce.date().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
  leadScore: z.number().optional().default(0),
  pipelineStageId: z.string().optional().nullable(),
  pipelineStage: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }).optional().nullable(),
  customFields: z.array(z.object({
    id: z.string(),
    value: z.string(),
    fieldDefinition: z.object({
      id: z.string(),
      key: z.string(),
      name: z.string(),
      type: z.string(),
    })
  })).optional().default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  channels: z.array(z.string()).optional().default([]),
})

export type Customer = z.infer<typeof customerSchema>

export const customerListSchema = z.array(customerSchema)
