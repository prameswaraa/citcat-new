"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Phone,
    CheckCircle,
    XCircle,
    RefreshCw,
    TrendingUp,
    Shield,
} from "lucide-react"
import { type PhoneNumberDetails } from "@/lib/api/waba-api"

interface PhoneNumberCardProps {
    phoneNumber: PhoneNumberDetails
    onRefresh?: () => void
}

export function PhoneNumberCard({
    phoneNumber,
    onRefresh,
}: PhoneNumberCardProps) {
    const [refreshing, setRefreshing] = useState(false)

    const handleRefresh = async () => {
        if (!onRefresh) return

        try {
            setRefreshing(true)
            await onRefresh()
        } finally {
            setRefreshing(false)
        }
    }

    const getQualityBadge = (rating?: string) => {
        switch (rating) {
            case "GREEN":
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-green-200 bg-green-50 text-green-700"
                    >
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                        High Quality
                    </Badge>
                )
            case "YELLOW":
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-yellow-200 bg-yellow-50 text-yellow-700"
                    >
                        <div className="w-2 h-2 rounded-full bg-yellow-600" />
                        Medium Quality
                    </Badge>
                )
            case "RED":
                return (
                    <Badge
                        variant="outline"
                        className="flex items-center gap-1 border-red-200 bg-red-50 text-red-700"
                    >
                        <div className="w-2 h-2 rounded-full bg-red-600" />
                        Low Quality
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline" className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        Unknown
                    </Badge>
                )
        }
    }

    const getTierInfo = (tier?: string) => {
        const tierMap: Record<string, { limit: string; color: string }> = {
            TIER_1K: { limit: "1,000", color: "text-blue-600" },
            TIER_10K: { limit: "10,000", color: "text-green-600" },
            TIER_100K: { limit: "100,000", color: "text-purple-600" },
            TIER_UNLIMITED: { limit: "Unlimited", color: "text-orange-600" },
        }

        return tierMap[tier || ""] || { limit: "Unknown", color: "text-muted-foreground" }
    }

    const tierInfo = getTierInfo(phoneNumber.messagingLimitTier)

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Phone className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-lg">
                                        {phoneNumber.displayPhoneNumber}
                                    </p>
                                    {phoneNumber.isPrimary && (
                                        <Badge variant="default" className="text-xs">
                                            Primary
                                        </Badge>
                                    )}
                                </div>
                                {phoneNumber.verifiedName && (
                                    <p className="text-sm text-muted-foreground">
                                        {phoneNumber.verifiedName}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                            />
                        </Button>
                    </div>

                    {/* Business Name */}
                    <div className="p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                            {phoneNumber.verifiedName ? (
                                <>
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Business Name
                                    </span>
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 text-amber-600" />
                                    <span className="text-sm font-medium text-muted-foreground">
                                        Business Name
                                    </span>
                                </>
                            )}
                        </div>
                        <p className="text-sm font-semibold text-foreground ml-7">
                            {phoneNumber.verifiedName ||
                                "Not set - Configure in Meta Business Manager"}
                        </p>
                    </div>

                    {/* Quality Rating */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                Quality Rating
                            </span>
                            {getQualityBadge(phoneNumber.qualityRating)}
                        </div>

                        {/* Quality Rating Progress Bar */}
                        <div className="w-full bg-secondary rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${phoneNumber.qualityRating === "GREEN"
                                        ? "bg-green-500 w-full"
                                        : phoneNumber.qualityRating === "YELLOW"
                                            ? "bg-yellow-500 w-2/3"
                                            : phoneNumber.qualityRating === "RED"
                                                ? "bg-red-500 w-1/3"
                                                : "bg-muted-foreground w-0"
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Messaging Tier */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Messaging Limit
                                </span>
                            </div>
                            <span className={`text-sm font-semibold ${tierInfo.color}`}>
                                {tierInfo.limit}/day
                            </span>
                        </div>

                        {/* Tier Progress Indicator */}
                        <div className="flex gap-1">
                            {[
                                "TIER_1K",
                                "TIER_10K",
                                "TIER_100K",
                                "TIER_UNLIMITED",
                            ].map((tier, index) => {
                                const currentTierIndex = [
                                    "TIER_1K",
                                    "TIER_10K",
                                    "TIER_100K",
                                    "TIER_UNLIMITED",
                                ].indexOf(phoneNumber.messagingLimitTier || "")
                                const isActive = index <= currentTierIndex

                                return (
                                    <div
                                        key={tier}
                                        className={`flex-1 h-1.5 rounded-full ${isActive ? "bg-blue-500" : "bg-secondary"
                                            }`}
                                    />
                                )
                            })}
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pt-2 border-t">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Shield className="h-3 w-3" />
                            <span>Phone Number ID: {phoneNumber.phoneNumberId}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
