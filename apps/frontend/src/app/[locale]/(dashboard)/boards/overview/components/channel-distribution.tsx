"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Cell, Pie, PieChart, Legend } from "recharts"
import { useDashboardStats } from "../hooks/use-dashboard-stats"

// Chart configuration for channels
// Requirements: 3.1, 3.2
const chartConfig = {
  whatsapp: {
    label: "WhatsApp",
    color: "hsl(142, 70%, 45%)",
  },
  instagram: {
    label: "Instagram",
    color: "hsl(340, 82%, 52%)",
  },
} satisfies ChartConfig

const COLORS = {
  whatsapp: "hsl(142, 70%, 45%)",
  instagram: "hsl(340, 82%, 52%)",
}

export default function ChannelDistribution() {
  const { stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const byChannel = stats?.messages?.byChannel || { whatsapp: 0, instagram: 0 }
  const total = byChannel.whatsapp + byChannel.instagram

  // Transform data for donut chart
  // Requirements: 3.1, 3.2
  const chartData = [
    { name: "WhatsApp", value: byChannel.whatsapp, fill: COLORS.whatsapp },
    { name: "Instagram", value: byChannel.instagram, fill: COLORS.instagram },
  ].filter((item) => item.value > 0)

  // Calculate percentages for display
  const whatsappPercent = total > 0 ? ((byChannel.whatsapp / total) * 100).toFixed(1) : "0"
  const instagramPercent = total > 0 ? ((byChannel.instagram / total) * 100).toFixed(1) : "0"

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Channel Distribution</CardTitle>
        <CardDescription>
          WhatsApp vs Instagram • {total.toLocaleString()} total messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            No message data available
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <span className="font-medium">
                          {Number(value).toLocaleString()} messages
                        </span>
                      )}
                    />
                  }
                />
                <Legend />
              </PieChart>
            </ChartContainer>

            {/* Channel stats summary */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS.whatsapp }}
                />
                <div className="flex flex-col">
                  <span className="font-medium">WhatsApp</span>
                  <span className="text-muted-foreground">
                    {byChannel.whatsapp.toLocaleString()} ({whatsappPercent}%)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: COLORS.instagram }}
                />
                <div className="flex flex-col">
                  <span className="font-medium">Instagram</span>
                  <span className="text-muted-foreground">
                    {byChannel.instagram.toLocaleString()} ({instagramPercent}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
