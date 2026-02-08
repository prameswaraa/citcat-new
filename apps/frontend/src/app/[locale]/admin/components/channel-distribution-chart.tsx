"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { Cell, Pie, PieChart, Legend } from "recharts"

interface ChannelDistributionChartProps {
  whatsapp?: number
  instagram?: number
  isLoading?: boolean
}

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

const COLORS = ["hsl(142, 70%, 45%)", "hsl(340, 82%, 52%)"]

export function ChannelDistributionChart({ whatsapp = 0, instagram = 0, isLoading }: ChannelDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }

  const total = whatsapp + instagram
  const chartData = [
    { name: "WhatsApp", value: whatsapp, fill: COLORS[0] },
    { name: "Instagram", value: instagram, fill: COLORS[1] },
  ].filter(item => item.value > 0)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Distribution</CardTitle>
          <CardDescription>Message breakdown by channel</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No message data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Distribution</CardTitle>
        <CardDescription>Message breakdown by channel ({total.toLocaleString()} total)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
