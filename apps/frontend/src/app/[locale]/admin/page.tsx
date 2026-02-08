"use client"

import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StatsGrid } from "./components/stats-grid"
import { MessageVolumeChart } from "./components/message-volume-chart"
import { ChannelDistributionChart } from "./components/channel-distribution-chart"
import { useAdminStats } from "./hooks/use-admin-stats"

export default function AdminOverviewPage() {
  const { stats, isLoading, error, refetch } = useAdminStats()

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and management
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards Grid */}
      <StatsGrid
        users={stats?.users}
        messages={stats?.messages}
        connections={stats?.connections}
        isLoading={isLoading}
      />

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <MessageVolumeChart />
        <ChannelDistributionChart
          whatsapp={stats?.messages.byChannel.whatsapp}
          instagram={stats?.messages.byChannel.instagram}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}
