"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useDashboardStats } from "../hooks/use-dashboard-stats"
import {
  Shield,
  AlertTriangle,
  Ban,
  Flag,
  Gauge,
} from "lucide-react"

// Requirements: 5.1, 5.2, 5.3, 5.4
export default function QualityMetrics() {
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

  const quality = stats?.quality || {
    rating: null,
    messagingTier: null,
    blockCount7days: 0,
    spamReportCount7days: 0,
    status: null,
  }

  // Get color based on quality rating - Requirements: 5.1
  const getRatingColor = (rating: string | null) => {
    switch (rating) {
      case "HIGH":
        return {
          bg: "bg-green-100 dark:bg-green-900/20",
          text: "text-green-600 dark:text-green-400",
          border: "border-green-200 dark:border-green-800",
        }
      case "MEDIUM":
        return {
          bg: "bg-yellow-100 dark:bg-yellow-900/20",
          text: "text-yellow-600 dark:text-yellow-400",
          border: "border-yellow-200 dark:border-yellow-800",
        }
      case "LOW":
        return {
          bg: "bg-red-100 dark:bg-red-900/20",
          text: "text-red-600 dark:text-red-400",
          border: "border-red-200 dark:border-red-800",
        }
      default:
        return {
          bg: "bg-gray-100 dark:bg-gray-900/20",
          text: "text-gray-600 dark:text-gray-400",
          border: "border-gray-200 dark:border-gray-800",
        }
    }
  }

  const ratingColors = getRatingColor(quality.rating)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Quality Metrics</CardTitle>
        <CardDescription>
          WhatsApp Business API quality status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quality Rating - Requirements: 5.1 */}
        <div className={`flex items-center justify-between rounded-lg border p-4 ${ratingColors.border} ${ratingColors.bg}`}>
          <div className="flex items-center gap-3">
            <Shield className={`h-6 w-6 ${ratingColors.text}`} />
            <div>
              <p className="text-sm font-medium">Quality Rating</p>
              <p className={`text-lg font-semibold ${ratingColors.text}`}>
                {quality.rating || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Messaging Tier - Requirements: 5.2 */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Messaging Tier</span>
          </div>
          <span className="text-sm font-medium">
            {quality.messagingTier || "N/A"}
          </span>
        </div>

        {/* Block and Spam Reports - Requirements: 5.4 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Last 7 Days</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center rounded-lg border p-3">
              <Ban className="h-5 w-5 text-orange-500 mb-1" />
              <span className="text-lg font-semibold">{quality.blockCount7days}</span>
              <span className="text-xs text-muted-foreground">Blocks</span>
            </div>
            <div className="flex flex-col items-center rounded-lg border p-3">
              <Flag className="h-5 w-5 text-red-500 mb-1" />
              <span className="text-lg font-semibold">{quality.spamReportCount7days}</span>
              <span className="text-xs text-muted-foreground">Spam Reports</span>
            </div>
          </div>
        </div>

        {/* Warning Alert when quality is LOW - Requirements: 5.3 */}
        {quality.rating === "LOW" && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Low Quality Rating</AlertTitle>
            <AlertDescription>
              Your WhatsApp quality rating is LOW. Consider reviewing your messaging practices to avoid restrictions. Reduce spam reports and blocks to improve your rating.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
