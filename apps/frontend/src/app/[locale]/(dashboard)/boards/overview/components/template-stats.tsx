"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDashboardStats } from "../hooks/use-dashboard-stats"
import {
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Megaphone,
  Wrench,
  ShieldCheck,
} from "lucide-react"

// Requirements: 4.1, 4.2, 4.3
export default function TemplateStats() {
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

  const templates = stats?.templates || {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    byCategory: {
      marketing: 0,
      utility: 0,
      authentication: 0,
    },
    usageThisMonth: 0,
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Template Stats</CardTitle>
        <CardDescription>
          {templates.total} templates • {templates.usageThisMonth.toLocaleString()} used this month
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Status Section - Requirements: 4.1 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">By Status</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center rounded-lg border p-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mb-1" />
              <span className="text-lg font-semibold">{templates.approved}</span>
              <span className="text-xs text-muted-foreground">Approved</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border p-3">
              <Clock className="h-5 w-5 text-yellow-500 mb-1" />
              <span className="text-lg font-semibold">{templates.pending}</span>
              <span className="text-xs text-muted-foreground">Pending</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border p-3">
              <XCircle className="h-5 w-5 text-red-500 mb-1" />
              <span className="text-lg font-semibold">{templates.rejected}</span>
              <span className="text-xs text-muted-foreground">Rejected</span>
            </div>
          </div>
        </div>

        {/* Template Category Section - Requirements: 4.2 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">By Category</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-purple-500" />
                <span className="text-sm">Marketing</span>
              </div>
              <span className="text-sm font-medium">{templates.byCategory.marketing}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Utility</span>
              </div>
              <span className="text-sm font-medium">{templates.byCategory.utility}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                <span className="text-sm">Authentication</span>
              </div>
              <span className="text-sm font-medium">{templates.byCategory.authentication}</span>
            </div>
          </div>
        </div>

        {/* Monthly Usage - Requirements: 4.3 */}
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Monthly Usage</span>
          </div>
          <span className="text-lg font-semibold">{templates.usageThisMonth.toLocaleString()}</span>
        </div>
      </CardContent>
    </Card>
  )
}
