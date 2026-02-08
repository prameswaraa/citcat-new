"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "../hooks/use-dashboard-stats"
import { Users } from "lucide-react"

// Pipeline Funnel Component
// Requirements: 2.4 - Display customer distribution by pipeline stage as a funnel chart
export default function PipelineFunnel() {
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

  const pipelineStages = stats?.customers?.byPipelineStage || []
  const totalCustomers = pipelineStages.reduce((sum, stage) => sum + stage.count, 0)

  // Find max count for calculating bar widths
  const maxCount = Math.max(...pipelineStages.map((s) => s.count), 1)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Pipeline Funnel</CardTitle>
        <CardDescription>
          Customer distribution by stage • {totalCustomers.toLocaleString()} total
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pipelineStages.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8" />
            <span>No pipeline stages configured</span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pipelineStages.map((stage, index) => {
              const widthPercent = (stage.count / maxCount) * 100
              const percentage = totalCustomers > 0 
                ? ((stage.count / totalCustomers) * 100).toFixed(1) 
                : "0"

              return (
                <div key={stage.stageId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: stage.stageColor || `hsl(${index * 60}, 70%, 50%)` }}
                      />
                      <span className="font-medium">{stage.stageName}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {stage.count.toLocaleString()} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-6 w-full rounded-sm bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-sm transition-all duration-500"
                      style={{
                        width: `${widthPercent}%`,
                        backgroundColor: stage.stageColor || `hsl(${index * 60}, 70%, 50%)`,
                        minWidth: stage.count > 0 ? "8px" : "0",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
