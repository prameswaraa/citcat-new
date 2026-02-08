"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { IconRobot, IconRobotOff } from "@tabler/icons-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { AssignmentResult, AssigneeType } from "../types/unified-inbox"

/**
 * AIStatusIndicator Component
 * 
 * Displays the AI status for a conversation based on assignment state.
 * Shows "AI Active" when assigned to AI Agent or unassigned with AI enabled.
 * Shows "AI Inactive" when assigned to a human.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

export interface AIStatusIndicatorProps {
  /** Current assignment for the conversation */
  assignment: AssignmentResult | null
  /** Whether AI is globally enabled (has AI agents available) */
  aiEnabled: boolean
  /** Default AI Agent name when unassigned */
  defaultAIAgentName?: string | null
  /** Size variant */
  size?: "sm" | "md"
  /** Show tooltip on hover */
  showTooltip?: boolean
  /** Additional CSS classes */
  className?: string
  // Alternative props for direct usage without full AssignmentResult
  /** Assignee type from conversation */
  assigneeType?: AssigneeType
  /** AI Agent name from conversation */
  aiAgentName?: string | null
  /** Whether conversation has a human assignee */
  hasHumanAssignee?: boolean
}

/**
 * Determine AI status based on assignment state
 * Requirements: 5.2, 5.3
 */
function getAIStatus(props: AIStatusIndicatorProps): {
  isActive: boolean
  agentName: string | null
  reason: "assigned_to_ai" | "assigned_to_human" | "unassigned_ai_enabled" | "ai_disabled"
} {
  const { 
    assignment, 
    aiEnabled, 
    defaultAIAgentName,
    assigneeType,
    aiAgentName,
    hasHumanAssignee
  } = props

  // Use direct props if provided, otherwise extract from assignment
  const effectiveAssigneeType = assigneeType ?? assignment?.assigneeType
  const effectiveAIAgentName = aiAgentName ?? assignment?.aiAgentName
  const effectiveHasHumanAssignee = hasHumanAssignee ?? (assignment?.assigneeId != null && effectiveAssigneeType !== "AI_AGENT")

  // Case 1: Assigned to AI Agent - AI Active with specific agent
  if (effectiveAssigneeType === "AI_AGENT" && effectiveAIAgentName) {
    return {
      isActive: true,
      agentName: effectiveAIAgentName,
      reason: "assigned_to_ai"
    }
  }

  // Case 2: Assigned to human - AI Inactive
  if (effectiveHasHumanAssignee) {
    return {
      isActive: false,
      agentName: null,
      reason: "assigned_to_human"
    }
  }

  // Case 3: Unassigned - check if AI is globally enabled
  if (aiEnabled) {
    return {
      isActive: true,
      agentName: defaultAIAgentName || null,
      reason: "unassigned_ai_enabled"
    }
  }

  // Case 4: AI disabled globally
  return {
    isActive: false,
    agentName: null,
    reason: "ai_disabled"
  }
}

export function AIStatusIndicator({
  assignment,
  aiEnabled,
  defaultAIAgentName,
  size = "sm",
  showTooltip = true,
  className,
  assigneeType,
  aiAgentName,
  hasHumanAssignee,
}: AIStatusIndicatorProps) {
  const t = useTranslations("messages.assignment")

  const status = getAIStatus({
    assignment,
    aiEnabled,
    defaultAIAgentName,
    assigneeType,
    aiAgentName,
    hasHumanAssignee,
  })

  const sizeClasses = {
    sm: "h-5 px-1.5 text-[10px] gap-1",
    md: "h-6 px-2 text-xs gap-1.5",
  }

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  }

  // Active state styling
  const activeClasses = status.isActive
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    : "bg-muted text-muted-foreground border-muted-foreground/20"

  const indicator = (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeClasses[size],
        activeClasses,
        className
      )}
    >
      {status.isActive ? (
        <IconRobot className={iconSizeClasses[size]} />
      ) : (
        <IconRobotOff className={iconSizeClasses[size]} />
      )}
      <span>{status.isActive ? t("aiStatus.active") : t("aiStatus.inactive")}</span>
    </div>
  )

  if (!showTooltip) {
    return indicator
  }

  // Build tooltip content based on status
  let tooltipContent: React.ReactNode
  if (status.isActive && status.agentName) {
    tooltipContent = (
      <div className="text-center">
        <p className="font-medium">{t("aiStatus.activeWithAgent", { name: status.agentName })}</p>
      </div>
    )
  } else if (status.isActive) {
    tooltipContent = <p>{t("aiStatus.activeDefault")}</p>
  } else if (status.reason === "assigned_to_human") {
    tooltipContent = <p>{t("aiStatus.inactiveHuman")}</p>
  } else {
    tooltipContent = <p>{t("aiStatus.inactiveDisabled")}</p>
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Export the status calculation function for testing
export { getAIStatus }
