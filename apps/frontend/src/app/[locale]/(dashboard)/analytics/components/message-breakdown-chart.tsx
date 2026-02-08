"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

interface MessageBreakdownChartProps {
    inbound: number
    outbound: number
}

const chartConfig = {
    inbound: {
        label: "Inbound",
        color: "hsl(var(--chart-2))",
    },
    outbound: {
        label: "Outbound",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

export function MessageBreakdownChart({ inbound, outbound }: MessageBreakdownChartProps) {
    const chartData = [
        { type: "Inbound", count: inbound, fill: "var(--color-inbound)" },
        { type: "Outbound", count: outbound, fill: "var(--color-outbound)" },
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Message Direction</CardTitle>
                <CardDescription>Inbound vs Outbound messages</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{
                            left: 0,
                        }}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="type"
                            type="category"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <XAxis type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="count" layout="vertical" radius={5} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
