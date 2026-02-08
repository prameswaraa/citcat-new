"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Clock, AlertTriangle, CheckCircle } from "lucide-react"
import {
    fetchWindowStatus,
    formatRemainingTime,
    getWindowStatusColor,
    shouldShowWarning,
    shouldShowUrgent,
    type WindowStatus,
} from "@/lib/window-utils"

interface WindowStatusBannerProps {
    customerId: string
    onStatusChange?: (status: WindowStatus | null) => void
}

export function WindowStatusBanner({
    customerId,
    onStatusChange,
}: WindowStatusBannerProps) {
    const [windowStatus, setWindowStatus] = useState<WindowStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const loadStatus = async () => {
        const status = await fetchWindowStatus(customerId)
        setWindowStatus(status)
        setLoading(false)
        onStatusChange?.(status)
    }

    useEffect(() => {
        loadStatus()

        // Refresh every 10 seconds
        const interval = setInterval(() => {
            loadStatus()
        }, 10000)

        return () => clearInterval(interval)
    }, [customerId])

    // Real-time countdown (update every second)
    useEffect(() => {
        if (!windowStatus?.isActive || !windowStatus.remainingTime) return

        const interval = setInterval(() => {
            setWindowStatus((prev) => {
                if (!prev?.remainingTime) return prev

                const newTotalSeconds = prev.remainingTime.totalSeconds - 1

                if (newTotalSeconds <= 0) {
                    loadStatus() // Reload to get actual status
                    return prev
                }

                const hours = Math.floor(newTotalSeconds / 3600)
                const minutes = Math.floor((newTotalSeconds % 3600) / 60)
                const seconds = newTotalSeconds % 60

                return {
                    ...prev,
                    remainingTime: {
                        hours,
                        minutes,
                        seconds,
                        totalSeconds: newTotalSeconds,
                    },
                }
            })
        }, 1000)

        return () => clearInterval(interval)
    }, [windowStatus?.isActive])

    if (loading) {
        return (
            <div className="border-b bg-gray-50 p-3 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
        )
    }

    if (!windowStatus) return null

    const { status, isActive, remainingTime } = windowStatus
    const isWarning = shouldShowWarning(remainingTime)
    const isUrgent = shouldShowUrgent(remainingTime)

    if (status === "never_messaged") {
        return (
            <Alert className="border-gray-200 bg-gray-50">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <AlertDescription className="text-sm">
                    <strong>Customer has never messaged you.</strong> Only template
                    messages are allowed.
                </AlertDescription>
            </Alert>
        )
    }

    if (status === "expired") {
        return (
            <Alert className="border-yellow-200 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-sm">
                    <strong>24-hour window expired.</strong> You can only send
                    pre-approved message templates. Window will reopen when customer
                    messages you again.
                </AlertDescription>
            </Alert>
        )
    }

    if (isActive) {
        const bgColor = isUrgent
            ? "bg-red-50 border-red-200"
            : isWarning
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
        const iconColor = isUrgent
            ? "text-red-600"
            : isWarning
                ? "text-yellow-600"
                : "text-green-600"
        const textColor = isUrgent
            ? "text-red-700"
            : isWarning
                ? "text-yellow-700"
                : "text-green-700"

        return (
            <Alert className={`${bgColor} border`}>
                {isUrgent ? (
                    <AlertTriangle className={`h-4 w-4 ${iconColor} animate-pulse`} />
                ) : (
                    <CheckCircle className={`h-4 w-4 ${iconColor}`} />
                )}
                <AlertDescription className="text-sm flex items-center justify-between">
                    <div className={textColor}>
                        <strong>Free messaging active</strong> - Window expires in{" "}
                        <Badge className={`${getWindowStatusColor(status)} ml-1 font-mono`}>
                            {formatRemainingTime(remainingTime)}
                        </Badge>
                    </div>
                    {isUrgent && (
                        <span className="text-xs text-red-600 font-semibold animate-pulse">
                            URGENT: Send messages now!
                        </span>
                    )}
                    {isWarning && !isUrgent && (
                        <span className="text-xs text-yellow-600">
                            Window closing soon
                        </span>
                    )}
                </AlertDescription>
            </Alert>
        )
    }

    return null
}
