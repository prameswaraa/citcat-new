"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { wabaApi, type WABADetails } from "@/lib/api/waba-api"
import { useToast } from "@/hooks/use-toast"

interface WABAConnectionButtonProps {
    onSuccess?: (waba: WABADetails) => void
    onError?: (error: Error) => void
    className?: string
    enableCoexistence?: boolean
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    children?: React.ReactNode
}

export function WABAConnectionButton({
    onSuccess,
    onError,
    className,
    enableCoexistence = true, // Enable coexistence by default (Embedded Signup v4)
    variant = "default",
    children,
}: WABAConnectionButtonProps) {
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const handleConnect = async () => {
        try {
            setLoading(true)

            // Initialize signup and get the Meta signup URL
            // Business account will be auto-created after OAuth callback
            const { signupUrl, state } = await wabaApi.initSignup(enableCoexistence)

            // Open popup window for embedded signup
            const width = 600
            const height = 700
            const left = window.screen.width / 2 - width / 2
            const top = window.screen.height / 2 - height / 2

            const popup = window.open(
                signupUrl,
                "waba-signup",
                `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
            )

            if (!popup) {
                throw new Error("Popup blocked. Please allow popups for this site.")
            }

            // Listen for messages from the callback page
            const handleMessage = (event: MessageEvent) => {
                // Verify origin for security
                if (event.origin !== window.location.origin) {
                    return
                }

                if (event.data.type === "waba-connection-success") {
                    setLoading(false)
                    toast({
                        title: "Success",
                        description: "WhatsApp Business Account connected successfully!",
                    })

                    if (onSuccess && event.data.waba) {
                        onSuccess(event.data.waba)
                    }

                    // Close popup
                    if (popup && !popup.closed) {
                        popup.close()
                    }

                    window.removeEventListener("message", handleMessage)
                } else if (event.data.type === "waba-connection-error") {
                    setLoading(false)
                    const error = new Error(event.data.error || "Failed to connect WABA")
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: error.message,
                    })

                    if (onError) {
                        onError(error)
                    }

                    // Close popup
                    if (popup && !popup.closed) {
                        popup.close()
                    }

                    window.removeEventListener("message", handleMessage)
                }
            }

            window.addEventListener("message", handleMessage)

            // Check if popup was closed without completing
            const checkPopupClosed = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopupClosed)
                    setLoading(false)
                    window.removeEventListener("message", handleMessage)

                    // Only show cancellation message if we didn't receive success/error
                    if (loading) {
                        toast({
                            title: "Info",
                            description: "WhatsApp connection cancelled",
                        })
                    }
                }
            }, 500)
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to initialize WhatsApp connection",
            })

            if (onError) {
                onError(error)
            }
        }
    }

    return (
        <Button
            onClick={handleConnect}
            disabled={loading}
            variant={variant}
            className={className}
        >
            {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                </>
            ) : children ? (
                children
            ) : (
                <>
                    <svg
                        className="mr-2 h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Connect WhatsApp
                </>
            )}
        </Button>
    )
}
