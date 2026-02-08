"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useDashboardStats } from "../hooks/use-dashboard-stats"
import { Star, Phone, User } from "lucide-react"

// Top Leads Component
// Requirements: 2.5 - Display top 5 customers by lead score
export default function TopLeads() {
  const { stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const topLeads = stats?.customers?.topLeads || []

  // Get score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50"
    if (score >= 50) return "text-yellow-600 bg-yellow-50"
    return "text-gray-600 bg-gray-50"
  }

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (!phone) return "-"
    // Show last 4 digits with mask
    if (phone.length > 4) {
      return `***${phone.slice(-4)}`
    }
    return phone
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base font-medium">Top Leads</CardTitle>
        <CardDescription>
          Top 5 customers by lead score
        </CardDescription>
      </CardHeader>
      <CardContent>
        {topLeads.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <Star className="h-8 w-8" />
            <span>No leads data available</span>
          </div>
        ) : (
          <div className="space-y-3">
            {topLeads.map((lead, index) => (
              <div
                key={lead.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {/* Rank indicator */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </div>

                {/* Lead info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium truncate">
                      {lead.name || "Unknown"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{formatPhone(lead.phoneNumber)}</span>
                    {lead.pipelineStage && (
                      <>
                        <span>•</span>
                        <span className="truncate">{lead.pipelineStage}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Lead score */}
                <Badge variant="secondary" className={getScoreColor(lead.leadScore)}>
                  <Star className="mr-1 h-3 w-3" />
                  {lead.leadScore}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
