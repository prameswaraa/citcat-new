"use client"

import { Wifi, WifiOff, RefreshCw } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { WebSocketState, ConnectionMode } from "@/hooks/use-websocket"

interface ConnectionStatusProps {
  state: WebSocketState
  className?: string
}

function getStatusConfig(state: WebSocketState): {
  icon: React.ReactNode
  label: string
  description: string
  colorClass: string
  dotClass: string
} {
  const { isConnected, isReconnecting, connectionMode, reconnectAttempts } = state

  // Connected via WebSocket
  if (isConnected && connectionMode === "websocket") {
    return {
      icon: <Wifi className="h-3.5 w-3.5" />,
      label: "Connected",
      description: "Real-time updates active",
      colorClass: "text-green-600 dark:text-green-400",
      dotClass: "bg-green-500",
    }
  }

  // Reconnecting
  if (isReconnecting) {
    const attemptText = reconnectAttempts > 0 ? ` (attempt ${reconnectAttempts})` : ""
    return {
      icon: <RefreshCw className="h-3.5 w-3.5 animate-spin" />,
      label: "Reconnecting...",
      description: `Attempting to restore connection${attemptText}`,
      colorClass: "text-amber-600 dark:text-amber-400",
      dotClass: "bg-amber-500",
    }
  }

  // Polling fallback mode
  if (connectionMode === "polling") {
    return {
      icon: <RefreshCw className="h-3.5 w-3.5" />,
      label: "Using backup connection",
      description: "Updates via polling every 15 seconds",
      colorClass: "text-blue-600 dark:text-blue-400",
      dotClass: "bg-blue-500",
    }
  }

  // Disconnected
  return {
    icon: <WifiOff className="h-3.5 w-3.5" />,
    label: "Disconnected",
    description: "No active connection",
    colorClass: "text-muted-foreground",
    dotClass: "bg-gray-400",
  }
}

export function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  const config = getStatusConfig(state)

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-md cursor-default",
              "hover:bg-muted/50 transition-colors",
              config.colorClass,
              className
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
            {config.icon}
            <span className="text-xs font-medium hidden sm:inline">
              {config.label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs opacity-80">{config.description}</p>
            {state.lastEventAt && (
              <p className="text-xs opacity-60">
                Last event: {formatTimeAgo(state.lastEventAt)}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  
  if (seconds < 60) return "just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
