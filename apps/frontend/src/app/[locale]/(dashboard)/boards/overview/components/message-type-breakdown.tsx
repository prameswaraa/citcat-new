"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "../hooks/use-dashboard-stats"
import {
  MessageSquare,
  Image,
  Video,
  FileText,
  LayoutTemplate,
  MoreHorizontal,
} from "lucide-react"

// Chart configuration for message types
// Requirements: 1.5
const chartConfig = {
  count: {
    label: "Messages",
  },
  text: {
    label: "Text",
    color: "hsl(var(--chart-1))",
  },
  image: {
    label: "Image",
    color: "hsl(var(--chart-2))",
  },
  video: {
    label: "Video",
    color: "hsl(var(--chart-3))",
  },
  document: {
    label: "Document",
    color: "hsl(var(--chart-4))",
  },
  template: {
    label: "Template",
    color: "hsl(var(--chart-5))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig

// Icon mapping for message types
const typeIcons: Record<string, React.ReactNode> = {
  text: <MessageSquare className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  template: <LayoutTemplate className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
}

export default function MessageTypeBreakdown() {
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

  const byType = stats?.messages?.byType || {
    text: 0,
    image: 0,
    video: 0,
    document: 0,
    template: 0,
    other: 0,
  }

  // Transform data for horizontal bar chart
  // Requirements: 1.5
  const chartData = [
    { type: "text", count: byType.text, fill: "var(--color-text)" },
    { type: "image", count: byType.image, fill: "var(--color-image)" },
    { type: "video", count: byType.video, fill: "var(--color-video)" },
    { type: "document", count: byType.document, fill: "var(--color-document)" },
    { type: "template", count: byType.template, fill: "var(--color-template)" },
    { type: "other", count: byType.other, fill: "var(--color-other)" },
  ].sort((a, b) => b.count - a.count) // Sort by count descending

  const totalMessages = chartData.reduce((sum, item) => sum + item.count, 0)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Message Types</CardTitle>
        <CardDescription>
          Breakdown by message type • {totalMessages.toLocaleString()} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalMessages === 0 ? (
          <div className="flex h-[280px] items-center justify-center text-muted-foreground">
            No message data available
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[280px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <YAxis
                dataKey="type"
                type="category"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={70}
                tickFormatter={(value) => {
                  const config = chartConfig[value as keyof typeof chartConfig]
                  return config && "label" in config ? String(config.label) : value
                }}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <div className="flex items-center gap-2">
                        {typeIcons[name as string]}
                        <span className="font-medium">{Number(value).toLocaleString()}</span>
                        <span className="text-muted-foreground">
                          ({totalMessages > 0 ? ((Number(value) / totalMessages) * 100).toFixed(1) : 0}%)
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                barSize={24}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
