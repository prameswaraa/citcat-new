"use client"

import { createContext, useContext } from "react"
import type { WebhookEndpoint } from "@/lib/api/webhooks-api"

interface WebhooksContextType {
  webhooks: WebhookEndpoint[]
  onWebhookCreated: (webhook: WebhookEndpoint) => void
  onWebhookUpdated: (webhook: WebhookEndpoint) => void
  onWebhookDeleted: (id: string) => void
  refreshWebhooks: () => Promise<void>
}

export const WebhooksContext = createContext<WebhooksContextType | null>(null)

export function useWebhooksContext() {
  const context = useContext(WebhooksContext)
  if (!context) {
    throw new Error("useWebhooksContext must be used within WebhooksContext.Provider")
  }
  return context
}
