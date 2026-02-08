"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { RevenueByTier } from "../../hooks/use-admin-revenue"

interface RevenueTierBreakdownProps {
  data: RevenueByTier | null
  isLoading?: boolean
}

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function TierBreakdownSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-60" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  )
}

export function RevenueTierBreakdown({ data, isLoading }: RevenueTierBreakdownProps) {
  if (isLoading) {
    return <TierBreakdownSkeleton />
  }

  const litePercentage = data?.lite.percentage ?? 0
  const proPercentage = data?.pro.percentage ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Tier</CardTitle>
        <CardDescription>Breakdown of revenue by subscription tier</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-blue-500" />
              <span className="font-medium">LITE</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {litePercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={litePercentage} className="h-2 [&>div]:bg-blue-500" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {data?.lite.count ?? 0} transactions
            </span>
            <span className="font-medium">{formatIDR(data?.lite.revenue ?? 0)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-purple-500" />
              <span className="font-medium">PRO</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {proPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress value={proPercentage} className="h-2 [&>div]:bg-purple-500" />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {data?.pro.count ?? 0} transactions
            </span>
            <span className="font-medium">{formatIDR(data?.pro.revenue ?? 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
