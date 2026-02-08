"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"
import { useBusinessAccount } from "@/hooks/use-business-account"

interface Activity {
  customer: string
  initials: string
  action: string
  time: string
}

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const { userId, isLoading: isLoadingAccount } = useBusinessAccount()

  useEffect(() => {
    // Only load data if user is authenticated
    if (!isLoadingAccount && userId) {
      loadData()
    } else if (!isLoadingAccount && !userId) {
      setLoading(false)
    }
  }, [userId, isLoadingAccount])

  const loadData = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
      const response = await fetch(`${apiUrl}/api/v1/dashboard/stats`, {
        credentials: "include",
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result.data)

        // Generate sample activities based on stats
        const sampleActivities: Activity[] = []

        if (result.data?.messages?.sent > 0) {
          const { sent, delivered, read, failed } = result.data.messages
          const deliveryRate = Math.round((delivered / sent) * 100)
          
          sampleActivities.push({
            customer: "Message Activity",
            initials: "MA",
            action: `${sent} messages sent (${deliveryRate}% delivered)`,
            time: "Today",
          })
        }

        if (result.data?.customers?.consented > 0) {
          sampleActivities.push({
            customer: "Customer Consent",
            initials: "CC",
            action: `${result.data.customers.consented} customers consented to marketing`,
            time: "This week",
          })
        }

        if (result.data?.templates?.approved > 0) {
          sampleActivities.push({
            customer: "Templates",
            initials: "TP",
            action: `${result.data.templates.approved} templates approved and ready`,
            time: "Active",
          })
        }

        setActivities(sampleActivities)
      }
    } catch (error) {
      console.error("Failed to load activities:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="bg-muted h-10 w-10 rounded-full animate-pulse"></div>
                <div className="flex-1 space-y-2">
                  <div className="bg-muted h-4 w-32 rounded animate-pulse"></div>
                  <div className="bg-muted h-3 w-48 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <p className="text-muted-foreground text-sm">
          You have {stats?.messages?.sent || 0} message deliveries this period
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.length === 0 ? (
            <div className="text-muted-foreground text-center py-8 text-sm">
              No recent activity
            </div>
          ) : (
            activities.map((activity, index) => (
              <div key={index} className="flex items-center gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {activity.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {activity.customer}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {activity.action}
                  </p>
                </div>
                <div className="text-muted-foreground text-sm">
                  {activity.time}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
