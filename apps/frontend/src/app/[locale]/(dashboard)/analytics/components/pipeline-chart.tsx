"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

interface PipelineChartProps {
    data: Array<{
        name: string
        count: number
        color: string
    }>
}

export function PipelineChart({ data }: PipelineChartProps) {
    const chartData = data.map((stage, index) => ({
        stage: stage.name,
        count: stage.count,
        fill: stage.color || `hsl(var(--chart-${(index % 5) + 1}))`,
    }))

    const chartConfig = data.reduce((config, stage, index) => {
        config[stage.name] = {
            label: stage.name,
            color: stage.color || `hsl(var(--chart-${(index % 5) + 1}))`,
        }
        return config
    }, {} as ChartConfig)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pipeline Overview</CardTitle>
                <CardDescription>Customers by pipeline stage</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <ChartContainer config={chartConfig} className="h-[280px] w-full">
                    <BarChart
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="stage"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tickFormatter={(value) => value.slice(0, 10)}
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
                        <Bar dataKey="count" radius={8} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
