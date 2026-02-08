"use client"

import { RefreshCw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import StatsCards from "./components/stats-cards"
import MessageMetrics from "./components/message-metrics"
import MessageTypeBreakdown from "./components/message-type-breakdown"
import ChannelDistribution from "./components/channel-distribution"
import PipelineFunnel from "./components/pipeline-funnel"
import TopLeads from "./components/top-leads"
import TemplateStats from "./components/template-stats"
import QualityMetrics from "./components/quality-metrics"
import { useDashboardStats } from "./hooks/use-dashboard-stats"
import { useWhatsAppPhoneNumbers } from "@/hooks/use-whatsapp-phone-numbers"
import { WhatsAppPhoneSelector } from "@/components/whatsapp-phone-selector"
import { DashboardFilterProvider } from "./context/dashboard-filter-context"

// Requirements: 6.1, 6.2, 6.3, 6.4
export default function Overview() {
  const {
    phoneNumbers,
    selectedPhoneNumberId,
    setSelectedPhoneNumberId,
  } = useWhatsAppPhoneNumbers()

  const { stats, isLoading, isRefetching, refetch, lastUpdated, error } =
    useDashboardStats(
      selectedPhoneNumberId ? { whatsappPhoneNumberId: selectedPhoneNumberId } : undefined
    )

  // Format last updated timestamp - Requirements: 6.4
  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "Never"
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  return (
    <DashboardFilterProvider whatsappPhoneNumberId={selectedPhoneNumberId ?? undefined}>
      <div className="space-y-6">
        {/* Header with phone selector, refresh button and last updated */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WhatsAppPhoneSelector
              phoneNumbers={phoneNumbers}
              selectedId={selectedPhoneNumberId}
              onSelect={setSelectedPhoneNumberId}
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last updated: {formatLastUpdated(lastUpdated)}</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            {isRefetching ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
              Try Again
            </Button>
          </div>
        )}

        {/* Row 1: Stats Cards - 4 cards in a row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCards />
        </div>

        {/* Row 2: Message Volume Chart - Full width */}
        <div className="grid grid-cols-1">
          <MessageMetrics />
        </div>

        {/* Row 3: Channel Distribution + Message Types + Template Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ChannelDistribution />
          <MessageTypeBreakdown />
          <TemplateStats />
        </div>

        {/* Row 4: Pipeline + Top Leads + Quality Metrics */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PipelineFunnel />
          <TopLeads />
          <QualityMetrics />
        </div>
      </div>
    </DashboardFilterProvider>
  )
}
