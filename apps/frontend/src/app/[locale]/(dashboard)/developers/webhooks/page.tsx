"use client"

import { useEffect, useState } from "react"
import { Plus, Webhook } from "lucide-react"
import { Link } from "@/i18n/routing"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { useSubscription } from "@/hooks/use-subscription"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"
import { webhooksApi, type WebhookEndpoint } from "@/lib/api/webhooks-api"
import { AddWebhook } from "./components/add-webhook"
import { columns } from "./components/webhooks-columns"
import { WebhooksTable } from "./components/webhooks-table"
import { WebhooksContext } from "./components/webhooks-context"

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Subscription feature gating
  const { tier, hasFeature, canCreate, getUsageText, refetch: refetchSubscription } = useSubscription()
  const hasWebhooksAccess = hasFeature("webhooksEnabled")
  const canCreateWebhook = canCreate("webhookEndpoints")
  const usageText = getUsageText("webhookEndpoints")

  const fetchWebhooks = async () => {
    try {
      setIsLoading(true)
      const data = await webhooksApi.list()
      setWebhooks(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch webhooks",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWebhooks()
  }, [])

  const handleWebhookCreated = (webhook: WebhookEndpoint) => {
    setWebhooks((prev) => [webhook, ...prev])
    refetchSubscription() // Refresh usage counts
  }

  const handleWebhookUpdated = (webhook: WebhookEndpoint) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === webhook.id ? webhook : w))
    )
  }

  const handleWebhookDeleted = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id))
    refetchSubscription() // Refresh usage counts
  }

  return (
    <WebhooksContext.Provider
      value={{
        webhooks,
        onWebhookCreated: handleWebhookCreated,
        onWebhookUpdated: handleWebhookUpdated,
        onWebhookDeleted: handleWebhookDeleted,
        refreshWebhooks: fetchWebhooks,
      }}
    >
      <div className="flex w-full flex-1 flex-col gap-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/developers">Developers</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Webhooks</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold">Webhooks</h2>
            <p className="text-muted-foreground text-sm">
              Setup webhook endpoints to receive real-time event notifications.
            </p>
          </div>
          {hasWebhooksAccess && (
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground text-sm">{usageText}</span>
              {canCreateWebhook ? (
                <AddWebhook />
              ) : (
                <Button variant="default" size="sm" disabled>
                  <Plus className="mr-1 h-4 w-4" />
                  Limit Reached
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="h-full flex-1 mt-6">
          {!hasWebhooksAccess ? (
            <div className="max-w-md">
              <UpgradePrompt
                feature="webhooksEnabled"
                currentTier={tier}
                requiredTier="BASIC"
              />
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          ) : webhooks.length > 0 ? (
            <WebhooksTable data={webhooks} columns={columns} />
          ) : (
            <div className="border-border flex flex-col items-center gap-4 rounded-lg border border-dashed px-6 py-10">
              <Webhook className="text-muted-foreground size-16" />
              <h2 className="text-lg font-semibold">No Webhooks Yet</h2>
              <p className="text-muted-foreground text-center">
                Get started by creating a webhook to{" "}
                <br className="hidden sm:block" /> receive real-time event
                notifications.
              </p>
              {canCreateWebhook ? (
                <AddWebhook />
              ) : (
                <Button variant="default" disabled>
                  <Plus className="mr-1 h-4 w-4" />
                  Limit Reached
                </Button>
              )}
            </div>
          )}
        </div>

        {hasWebhooksAccess && webhooks.length > 0 && !canCreateWebhook && (
          <p className="text-muted-foreground mt-4 text-sm">
            You've reached your webhook limit ({usageText}). <Link href="/subscription" className="text-primary underline">Upgrade your plan</Link> to create more.
          </p>
        )}
      </div>
    </WebhooksContext.Provider>
  )
}
