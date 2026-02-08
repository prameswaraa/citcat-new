"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Label, Pie, PieChart } from "recharts"

interface LeadScoreChartProps {
    data: {
        low: number
        medium: number
        high: number
    }
}

const chartConfig = {
    customers: {
        label: "Customers",
    },
    low: {
        label: "Low (0-33)",
        color: "hsl(var(--chart-3))",
    },
    medium: {
        label: "Medium (34-66)",
        color: "hsl(var(--chart-2))",
    },
    high: {
        label: "High (67-100)",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

export function LeadScoreChart({ data }: LeadScoreChartProps) {
    const chartData = [
        { category: "low", customers: data.low, fill: "var(--color-low)" },
        { category: "medium", customers: data.medium, fill: "var(--color-medium)" },
        { category: "high", customers: data.high, fill: "var(--color-high)" },
    ]

    const totalCustomers = data.low + data.medium + data.high

    return (
        <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
                <CardTitle>Lead Score Distribution</CardTitle>
                <CardDescription>Customer segmentation by lead score</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-6">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[200px]"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="customers"
                            nameKey="category"
                            innerRadius={60}
                            strokeWidth={5}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    className="fill-foreground text-3xl font-bold"
                                                >
                                                    {totalCustomers.toLocaleString()}
                                                </tspan>
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 24}
                                                    className="fill-muted-foreground"
                                                >
                                                    Customers
                                                </tspan>
                                            </text>
                                        )
                                    }
                                }}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
