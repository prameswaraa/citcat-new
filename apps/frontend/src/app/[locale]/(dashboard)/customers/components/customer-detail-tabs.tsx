"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconHistory, IconUser } from "@tabler/icons-react"
import { ActivityTimeline } from "./activity-timeline"
import { Customer } from "../data/schema"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { format, formatDistanceToNow } from "date-fns"
import {
    IconPhone,
    IconMail,
    IconClock,
    IconCheck,
    IconTags,
    IconFileText,
    IconMessageCircle,
    IconCalendar,
    IconListDetails,
} from "@tabler/icons-react"

interface CustomerDetailTabsProps {
    customer: Customer
    getConsentBadge: (status: string) => React.ReactNode
}

export function CustomerDetailTabs({ customer, getConsentBadge }: CustomerDetailTabsProps) {
    return (
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">
                    <IconUser className="mr-2 h-4 w-4" />
                    Details
                </TabsTrigger>
                <TabsTrigger value="activity">
                    <IconHistory className="mr-2 h-4 w-4" />
                    Activity
                </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-6">
                {/* Contact Information */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                        Contact Information
                    </h4>

                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <IconPhone className="text-muted-foreground mt-0.5 h-4 w-4" />
                            <div className="flex-1">
                                <p className="text-muted-foreground text-xs">Phone Number</p>
                                <p className="font-medium">{customer.phoneNumber}</p>
                            </div>
                        </div>

                        {customer.email && (
                            <div className="flex items-start gap-3">
                                <IconMail className="text-muted-foreground mt-0.5 h-4 w-4" />
                                <div className="flex-1">
                                    <p className="text-muted-foreground text-xs">Email</p>
                                    <p className="font-medium">{customer.email}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <Separator />

                {/* Marketing Consent */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                        Marketing Consent
                    </h4>
                    <div className="flex items-start gap-3">
                        <IconCheck className="text-muted-foreground mt-0.5 h-4 w-4" />
                        <div className="flex-1">
                            <p className="text-muted-foreground text-xs">Status</p>
                            <div className="mt-1">
                                {getConsentBadge(customer.consentStatus)}
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Message Window */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                        Message Window
                    </h4>
                    <div className="flex items-start gap-3">
                        <IconClock className="text-muted-foreground mt-0.5 h-4 w-4" />
                        <div className="flex-1">
                            <p className="text-muted-foreground text-xs">24-Hour Window</p>
                            {customer.hasActiveWindow && customer.windowExpiresAt ? (
                                <div className="mt-1">
                                    <Badge className="bg-emerald-600">Active</Badge>
                                    <p className="text-muted-foreground text-xs mt-1">
                                        Expires {formatDistanceToNow(new Date(customer.windowExpiresAt), { addSuffix: true })}
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-1">
                                    <Badge variant="outline">No Active Window</Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <Separator />

                {/* Tags */}
                {customer.tags && customer.tags.length > 0 && (
                    <>
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                                Tags
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {customer.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary">
                                        <IconTags className="mr-1 h-3 w-3" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <Separator />
                    </>
                )}

                {/* Custom Fields */}
                {customer.customFields && customer.customFields.length > 0 && (
                    <>
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                                Custom Fields
                            </h4>
                            <div className="space-y-3">
                                {customer.customFields.map((cf: any) => (
                                    <div key={cf.id} className="flex items-start gap-3">
                                        <IconListDetails className="text-muted-foreground mt-0.5 h-4 w-4" />
                                        <div className="flex-1">
                                            <p className="text-muted-foreground text-xs">{cf.fieldDefinition.name}</p>
                                            <p className="font-medium">{cf.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Separator />
                    </>
                )}

                {/* Notes */}
                {customer.notes && Array.isArray(customer.notes) && customer.notes.length > 0 && (
                    <>
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                                Notes ({customer.notes.length})
                            </h4>
                            <div className="space-y-3">
                                {customer.notes.map((note: any) => (
                                    <div key={note.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                                        <IconFileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="whitespace-pre-wrap text-sm break-words">{note.content}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {note.createdBy} • {new Date(note.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <Separator />
                    </>
                )}
                {/* Legacy single note support */}
                {customer.notes && typeof customer.notes === 'string' && (
                    <>
                        <div className="space-y-4">
                            <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                                Notes
                            </h4>
                            <div className="flex items-start gap-3">
                                <IconFileText className="text-muted-foreground mt-0.5 h-4 w-4" />
                                <div className="flex-1">
                                    <p className="whitespace-pre-wrap text-sm">{customer.notes}</p>
                                </div>
                            </div>
                        </div>
                        <Separator />
                    </>
                )}

                {/* Activity Summary */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-sm uppercase text-muted-foreground">
                        Activity Summary
                    </h4>

                    <div className="space-y-3">
                        {customer.lastMessageAt && (
                            <div className="flex items-start gap-3">
                                <IconMessageCircle className="text-muted-foreground mt-0.5 h-4 w-4" />
                                <div className="flex-1">
                                    <p className="text-muted-foreground text-xs">Last Message</p>
                                    <p className="font-medium">
                                        {format(new Date(customer.lastMessageAt), "MMM dd, yyyy 'at' HH:mm")}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {formatDistanceToNow(new Date(customer.lastMessageAt), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-start gap-3">
                            <IconCalendar className="text-muted-foreground mt-0.5 h-4 w-4" />
                            <div className="flex-1">
                                <p className="text-muted-foreground text-xs">Added On</p>
                                <p className="font-medium">
                                    {format(new Date(customer.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    {formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
                <ActivityTimeline customerId={customer.id} />
            </TabsContent>
        </Tabs>
    )
}
