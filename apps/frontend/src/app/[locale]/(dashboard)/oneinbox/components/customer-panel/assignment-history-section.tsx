"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { IconHistory, IconUserPlus, IconUserOff, IconRobot } from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import { assignmentApi } from "@/lib/api/assignment-api"
import type { AssignmentHistoryItem, ChannelType } from "../../types/unified-inbox"

/**
 * AssignmentHistorySection Component
 * 
 * Displays the assignment history for a conversation in the customer panel.
 * Shows chronological list of assignments with assignee name, assigned by, and timestamps.
 * Supports both human and AI Agent assignments with distinct visual indicators.
 * 
 * Requirements: 7.1, 7.2, 7.3, 8.2, 8.3
 */

interface AssignmentHistorySectionProps {
  conversationId: string
  conversationType: ChannelType
  maxDisplay?: number
}

export function AssignmentHistorySection({
  conversationId,
  conversationType,
  maxDisplay = 5,
}: AssignmentHistorySectionProps) {
  const t = useTranslations("messages.assignment.history")
  const tErrors = useTranslations("messages.assignment.errors")
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Extract raw conversation ID (remove wa- or ig- prefix)
  const rawConversationId = conversationId.replace(/^(wa|ig)-/, "")

  // Load assignment history
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await assignmentApi.getAssignmentHistory(rawConversationId, conversationType)
        setHistory(data)
      } catch (err: any) {
        console.error("Failed to load assignment history:", err)
        setError(tErrors("loadFailed"))
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [rawConversationId, conversationType, tErrors])

  const displayedHistory = showAll ? history : history.slice(0, maxDisplay)
  const hasMore = history.length > maxDisplay
  const remainingCount = history.length - maxDisplay

  const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  /**
   * Get display name for an assignment history item
   * Shows "AI Agent: [Name]" for AI assignments, user name for human assignments
   * Requirements: 7.1, 7.2, 7.3
   */
  const getDisplayName = (item: AssignmentHistoryItem): string => {
    if (item.assigneeType === "AI_AGENT" && item.aiAgentName) {
      return `AI Agent: ${item.aiAgentName}`
    }
    return item.assigneeName || "Unknown"
  }

  /**
   * Check if assignment is to an AI Agent
   * Requirements: 7.1
   */
  const isAIAgentAssignment = (item: AssignmentHistoryItem): boolean => {
    return item.assigneeType === "AI_AGENT"
  }

  if (loading) {
    return (
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <IconHistory className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-sm font-medium">{t("title")}</h4>
        </div>
        <p className="text-xs text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <IconHistory className="h-4 w-4 text-muted-foreground" />
          {t("title")}
        </h4>
        {history.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {history.length === 1 
              ? t("records", { count: history.length })
              : t("recordsPlural", { count: history.length })}
          </span>
        )}
      </div>

      {/* History list */}
      <div className="space-y-2">
        {displayedHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noHistory")}</p>
        ) : (
          displayedHistory.map((item) => {
            const isActive = !item.unassignedAt
            const isAI = isAIAgentAssignment(item)
            const displayName = getDisplayName(item)
            
            return (
              <div
                key={item.id}
                className={`p-2 rounded-md text-sm ${
                  isActive ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Assignee avatar - show robot icon for AI Agent, avatar for human */}
                  {isAI ? (
                    <div className="h-6 w-6 flex-shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                      <IconRobot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  ) : (
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                        {getInitials(item.assigneeName || "?")}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    {/* Assignee name and status */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{displayName}</span>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                          {t("current")}
                        </span>
                      )}
                    </div>
                    
                    {/* Assignment details */}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      <div className="flex items-center gap-1">
                        <IconUserPlus className="h-3 w-3" />
                        <span>
                          {t("assignedBy", { name: item.assignedByName || "Unknown" })} •{" "}
                          {formatDistanceToNow(item.assignedAt, { addSuffix: true })}
                        </span>
                      </div>
                      
                      {item.unassignedAt && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <IconUserOff className="h-3 w-3" />
                          <span>
                            {t("unassignedTime", { time: formatDistanceToNow(item.unassignedAt, { addSuffix: true }) })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Show more/less button */}
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full mt-2 text-xs"
        >
          {remainingCount === 1 
            ? t("showMore", { count: remainingCount })
            : t("showMorePlural", { count: remainingCount })}
        </Button>
      )}
      {showAll && hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(false)}
          className="w-full mt-2 text-xs"
        >
          {t("showLess")}
        </Button>
      )}
    </div>
  )
}
