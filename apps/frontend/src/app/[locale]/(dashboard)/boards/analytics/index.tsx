"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { useBusinessAccount } from "@/hooks/use-business-account"

export default function Analytics() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const { userId, isLoading: isLoadingAccount } = useBusinessAccount()

  useEffect(() => {
    // Only load analytics if user is authenticated
    if (!isLoadingAccount && userId) {
      loadAnalytics()
    } else if (!isLoadingAccount && !userId) {
      setLoading(false)
    }
  }, [userId, isLoadingAccount])

  const loadAnalytics = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
      const response = await fetch(`${apiUrl}/api/v1/dashboard/stats`, {
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result.data)
      }
    } catch (error) {
      console.error("Failed to load analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  // Sample data for charts
  const messageDeliveryData = [
    { month: "Jan", sent: 45, delivered: 42, failed: 3 },
    { month: "Feb", sent: 52, delivered: 49, failed: 3 },
    { month: "Mar", sent: 61, delivered: 58, failed: 3 },
    { month: "Apr", sent: 58, delivered: 54, failed: 4 },
    { month: "May", sent: 71, delivered: 67, failed: 4 },
    { month: "Jun", sent: 85, delivered: 81, failed: 4 },
  ]

  const customerGrowthData = [
    { month: "Jan", customers: 120 },
    { month: "Feb", customers: 145 },
    { month: "Mar", customers: 178 },
    { month: "Apr", customers: 195 },
    { month: "May", customers: 223 },
    { month: "Jun", customers: 256 },
  ]

  const templateData = [
    { name: "Marketing", count: stats?.templates?.approved || 5 },
    { name: "Transactional", count: Math.floor((stats?.templates?.total || 8) * 0.6) },
    { name: "Utility", count: Math.floor((stats?.templates?.total || 8) * 0.3) },
  ]

  const messageChartConfig = {
    sent: {
      label: "Sent",
      color: "hsl(var(--chart-1))",
    },
    delivered: {
      label: "Delivered",
      color: "hsl(var(--chart-2))",
    },
    failed: {
      label: "Failed",
      color: "hsl(var(--chart-5))",
    },
  } satisfies ChartConfig

  const customerChartConfig = {
    customers: {
      label: "Customers",
      color: "hsl(var(--chart-3))",
    },
  } satisfies ChartConfig

  const templateChartConfig = {
    count: {
      label: "Templates",
      color: "hsl(var(--chart-4))",
    },
  } satisfies ChartConfig

  if (loading) {
    return (
      <div className="grid auto-rows-auto grid-cols-6 gap-5">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="col-span-6 xl:col-span-2">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="bg-muted h-4 w-32 rounded"></div>
                <div className="bg-muted h-48 w-full rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid auto-rows-auto grid-cols-6 gap-5">
      {/* Message Delivery Trends */}
      <div className="col-span-6 xl:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Message Delivery Trends</CardTitle>
            <p className="text-muted-foreground text-sm">
              Monthly message delivery statistics
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={messageChartConfig} className="h-[300px] w-full">
              <AreaChart
                data={messageDeliveryData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="sent"
                  stackId="1"
                  stroke="var(--color-sent)"
                  fill="var(--color-sent)"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stackId="2"
                  stroke="var(--color-delivered)"
                  fill="var(--color-delivered)"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stackId="3"
                  stroke="var(--color-failed)"
                  fill="var(--color-failed)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Customer Growth */}
      <div className="col-span-6 xl:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Customer Growth</CardTitle>
            <p className="text-muted-foreground text-sm">
              Total customers over time
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={customerChartConfig} className="h-[300px] w-full">
              <AreaChart
                data={customerGrowthData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="customers"
                  stroke="var(--color-customers)"
                  fill="var(--color-customers)"
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Template Distribution */}
      <div className="col-span-6 lg:col-span-3 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Template Distribution</CardTitle>
            <p className="text-muted-foreground text-sm">
              Templates by category
            </p>
          </CardHeader>
          <CardContent>
            <ChartContainer config={templateChartConfig} className="h-[200px] w-full">
              <BarChart
                data={templateData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-muted-foreground text-xs"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Delivery Rate */}
      <div className="col-span-6 lg:col-span-3 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Delivery Rate</CardTitle>
            <p className="text-muted-foreground text-sm">
              Message delivery success
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold">
                  {stats?.messages?.sent > 0
                    ? Math.round((stats.messages.delivered / stats.messages.sent) * 100)
                    : 0}
                  %
                </div>
                <p className="text-muted-foreground text-sm mt-2">
                  Success rate
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Delivered</span>
                  <span className="font-medium">{stats?.messages?.delivered || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Failed</span>
                  <span className="font-medium">{stats?.messages?.failed || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Sent</span>
                  <span className="font-medium">{stats?.messages?.sent || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Rating */}
      <div className="col-span-6 lg:col-span-3 xl:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Quality Rating</CardTitle>
            <p className="text-muted-foreground text-sm">
              Current phone number quality
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/20 mb-3">
                  <span className="text-2xl font-bold text-emerald-600">
                    {stats?.quality?.rating || "N/A"}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  Status: {stats?.quality?.status || "Unknown"}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  Maintain high quality to ensure message delivery
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
