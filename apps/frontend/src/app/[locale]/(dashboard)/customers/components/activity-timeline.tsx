"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, MessageSquare, ArrowRight, Edit, StickyNote, UserPlus, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Activity {
    id: string
    type: string
    title: string
    description?: string
    metadata?: any
    timestamp: string
    user: {
        id: string
        name: string
        email: string
    }
}

interface ActivityTimelineProps {
    customerId: string
}

const activityIcons: Record<string, any> = {
    MESSAGE_SENT: MessageSquare,
    MESSAGE_RECEIVED: MessageSquare,
    STAGE_CHANGED: ArrowRight,
    FIELD_UPDATED: Edit,
    NOTE_ADDED: StickyNote,
    CUSTOMER_CREATED: UserPlus,
    CONSENT_CHANGED: CheckCircle2,
}

const activityColors: Record<string, string> = {
    MESSAGE_SENT: "text-blue-500",
    MESSAGE_RECEIVED: "text-green-500",
    STAGE_CHANGED: "text-purple-500",
    FIELD_UPDATED: "text-orange-500",
    NOTE_ADDED: "text-yellow-500",
    CUSTOMER_CREATED: "text-teal-500",
    CONSENT_CHANGED: "text-pink-500",
}

export function ActivityTimeline({ customerId }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)
    const [offset, setOffset] = useState(0)
    const [noteText, setNoteText] = useState("")
    const [addingNote, setAddingNote] = useState(false)
    const { toast } = useToast()

    const limit = 20

    const fetchActivities = async (isLoadMore = false) => {
        try {
            if (isLoadMore) {
                setLoadingMore(true)
            } else {
                setLoading(true)
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
            const currentOffset = isLoadMore ? offset : 0

            const response = await fetch(
                `${apiUrl}/api/v1/customers/${customerId}/activities?limit=${limit}&offset=${currentOffset}`,
                { credentials: "include" }
            )

            if (!response.ok) {
                throw new Error("Failed to fetch activities")
            }

            const result = await response.json()

            if (result.success) {
                if (isLoadMore) {
                    setActivities(prev => [...prev, ...result.data])
                } else {
                    setActivities(result.data)
                }
                setHasMore(result.pagination.hasMore)
                setOffset(currentOffset + limit)
            }
        } catch (error) {
            console.error("Error fetching activities:", error)
            toast({
                title: "Error",
                description: "Failed to load activities",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
            setLoadingMore(false)
        }
    }

    const handleAddNote = async () => {
        if (!noteText.trim()) return

        try {
            setAddingNote(true)
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"

            const response = await fetch(
                `${apiUrl}/api/v1/customers/${customerId}/activities`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        type: "NOTE_ADDED",
                        title: "Note added",
                        description: noteText,
                    }),
                }
            )

            if (!response.ok) {
                throw new Error("Failed to add note")
            }

            const result = await response.json()

            if (result.success) {
                // Add new activity to the top of the list
                setActivities(prev => [result.data, ...prev])
                setNoteText("")
                toast({
                    title: "Success",
                    description: "Note added successfully",
                })
            }
        } catch (error) {
            console.error("Error adding note:", error)
            toast({
                title: "Error",
                description: "Failed to add note",
                variant: "destructive",
            })
        } finally {
            setAddingNote(false)
        }
    }

    useEffect(() => {
        fetchActivities()
    }, [customerId])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Add Note Section */}
            <Card>
                <CardContent className="pt-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Add Note</label>
                        <Textarea
                            placeholder="Add a note about this customer..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            rows={3}
                        />
                        <Button
                            onClick={handleAddNote}
                            disabled={!noteText.trim() || addingNote}
                            size="sm"
                        >
                            {addingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Note
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Timeline */}
            <div className="space-y-4">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        No activities yet
                    </div>
                ) : (
                    activities.map((activity, index) => {
                        const Icon = activityIcons[activity.type] || StickyNote
                        const iconColor = activityColors[activity.type] || "text-gray-500"

                        return (
                            <div key={activity.id} className="flex gap-3">
                                {/* Timeline Line */}
                                <div className="flex flex-col items-center">
                                    <div className={`rounded-full p-2 bg-muted ${iconColor}`}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    {index < activities.length - 1 && (
                                        <div className="w-px h-full bg-border mt-2" />
                                    )}
                                </div>

                                {/* Activity Content */}
                                <div className="flex-1 pb-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{activity.title}</p>
                                            {activity.description && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {activity.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {activity.user.name}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(activity.timestamp), "MMM d, yyyy 'at' h:mm a")}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}

                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center pt-4">
                        <Button
                            variant="outline"
                            onClick={() => fetchActivities(true)}
                            disabled={loadingMore}
                        >
                            {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Load More
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
