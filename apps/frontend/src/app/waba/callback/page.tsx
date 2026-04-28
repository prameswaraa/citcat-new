"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"

function WABACallbackContent() {
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")
    const [code, setCode] = useState("")
    const hasHandled = useRef(false)

    useEffect(() => {
        const handleCallback = async () => {
            if (hasHandled.current) {
                return
            }
            hasHandled.current = true

            try {
                const error = searchParams.get("error")
                const errorReason = searchParams.get("error_reason")
                const errorDescription = searchParams.get("error_description")

                if (error) {
                    if (error === "access_denied" || errorReason === "user_denied") {
                        throw new Error(
                            'You cancelled the WhatsApp connection. Click "Try Again" to reconnect.'
                        )
                    }
                    throw new Error(
                        errorDescription || "WhatsApp connection failed. Please try again."
                    )
                }

                const authCode = searchParams.get("code")
                if (!authCode) {
                    throw new Error(
                        "Missing authorization code. Please try connecting again."
                    )
                }

                setCode(authCode)
                setStatus("success")
                setMessage("Authorization code received from Facebook.")

                if (window.opener) {
                    window.opener.postMessage(
                        {
                            type: "waba-embedded-signup-code",
                            code: authCode,
                        },
                        window.location.origin
                    )
                }
            } catch (error: any) {
                setStatus("error")
                const errorMessage =
                    error?.message ||
                    "Failed to receive authorization code from Facebook"
                setMessage(errorMessage)

                if (window.opener) {
                    window.opener.postMessage(
                        {
                            type: "waba-connection-error",
                            error: errorMessage,
                        },
                        window.location.origin
                    )
                }
            }
        }

        handleCallback()
    }, [searchParams])

    const handleClose = () => {
        window.close()
    }

    return (
        <div className="text-center space-y-4">
            {status === "loading" && (
                <>
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold">Waiting for Facebook...</h2>
                    <p className="text-sm text-muted-foreground">
                        Receiving authorization code from Facebook
                    </p>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-green-700">Code Received</h2>
                    <p className="text-sm text-muted-foreground">{message}</p>
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left">
                        <p className="text-sm font-medium mb-2">Authorization Code:</p>
                        <p className="text-xs break-all font-mono text-muted-foreground">
                            {code}
                        </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                        This window can now be closed.
                    </p>
                    <Button onClick={handleClose} variant="outline" className="mt-2">
                        Close
                    </Button>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-red-700">
                        Connection Failed
                    </h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {message}
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button onClick={handleClose} variant="default" className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Close
                        </Button>
                    </div>
                </>
            )}
        </div>
    )
}

export default function WABACallbackPage() {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <Suspense
                        fallback={
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                                </div>
                                <h2 className="text-xl font-semibold">Loading...</h2>
                            </div>
                        }
                    >
                        <WABACallbackContent />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    )
}
