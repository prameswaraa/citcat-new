"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// CRM Settings has been moved to Pipeline page
// This page redirects for backward compatibility
export default function CrmSettingsPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace("/crm/pipeline?tab=settings")
    }, [router])

    return (
        <div className="flex items-center justify-center p-8">
            <p className="text-muted-foreground">Redirecting to Pipeline Settings...</p>
        </div>
    )
}
