"use client"

import { useState } from "react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "../hooks/use-dashboard-stats"

// Chart configuration for WhatsApp and Instagram lines
// Requirements: 1.4, 3.1
const chartConfig = {
  whatsapp: {
    label: "WhatsApp",
    color: "hsl(142, 70%, 45%)", // WhatsApp green
  },
  instagram: {
    label: "Instagram",
    color: "hsl(340, 75%, 55%)", // Instagram pink/magenta
  },
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

type DateRange = "7" | "14" | "30"

export default function MessageMetrics() {
  const { messageVolume, isLoading, stats } = useDashboardStats()
  const [dateRange, setDateRange] = useState<DateRange>("30")

  // Filter data based on selected date range
  const filteredData = messageVolume.slice(-parseInt(dateRange))

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const totalMessages = stats?.messages?.total || 0
  const whatsappTotal = stats?.messages?.byChannel?.whatsapp || 0
  const instagramTotal = stats?.messages?.byChannel?.instagram || 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Message Volume</CardTitle>
          <CardDescription>
            {totalMessages.toLocaleString()} total messages • WA: {whatsappTotal.toLocaleString()} • IG: {instagramTotal.toLocaleString()}
          </CardDescription>
        </div>
        {/* Date range selector - Requirements: 1.4 */}
        <Select value={dateRange} onValueChange={(value: DateRange) => setDateRange(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="flex h-[250px] items-center justify-center text-muted-foreground">
            No message data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <LineChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="whatsappGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-whatsapp)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-whatsapp)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="instagramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-instagram)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-instagram)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                }}
              />
              <YAxis tickLine={false} axisLine={false} tickMargin={8} width={40} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "long",
                        day: "numeric",
                      })
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              {/* WhatsApp line - Requirements: 3.1 */}
              <Line
                type="monotone"
                dataKey="whatsapp"
                stroke="var(--color-whatsapp)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              {/* Instagram line - Requirements: 3.1 */}
              <Line
                type="monotone"
                dataKey="instagram"
                stroke="var(--color-instagram)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
