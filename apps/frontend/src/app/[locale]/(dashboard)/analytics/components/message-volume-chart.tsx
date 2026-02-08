"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

interface MessageVolumeChartProps {
    data: Array<{
        date: string
        count: number
    }>
}

const chartConfig = {
    count: {
        label: "Messages",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

export function MessageVolumeChart({ data }: MessageVolumeChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Message Volume</CardTitle>
                <CardDescription>Daily message activity over time</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <AreaChart
                        data={data}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                })
                            }}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Area
                            dataKey="count"
                            type="natural"
                            fill="var(--color-count)"
                            fillOpacity={0.4}
                            stroke="var(--color-count)"
                            stackId="a"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
