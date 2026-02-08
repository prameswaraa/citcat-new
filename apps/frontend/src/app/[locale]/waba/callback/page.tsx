"use client"

import { Suspense, useEffect, useState, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"
import { wabaApi } from "@/lib/api/waba-api"

function WABACallbackContent() {
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")
    const [wabaData, setWabaData] = useState<any>(null)
    const hasCalledCallback = useRef(false)

    useEffect(() => {
        const handleCallback = async () => {
            if (hasCalledCallback.current) {
                return
            }
            hasCalledCallback.current = true
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

                const code = searchParams.get("code")
                const state = searchParams.get("state")

                if (!code || !state) {
                    throw new Error(
                        "Missing authorization code. Please try connecting again."
                    )
                }

                const result = await wabaApi.handleCallback(code, state)

                setStatus("success")

                if (result.warnings && result.warnings.length > 0) {
                    const warningMessages = result.warnings
                        .map((w: any) => w.message)
                        .join(". ")
                    setMessage(
                        `WhatsApp connected successfully! Note: ${warningMessages}`
                    )
                } else {
                    setMessage("WhatsApp Business Account connected successfully!")
                }

                setWabaData(result.waba)

                if (window.opener) {
                    window.opener.postMessage(
                        {
                            type: "waba-connection-success",
                            waba: result.waba,
                            phoneNumbers: result.phoneNumbers,
                            warnings: result.warnings,
                        },
                        window.location.origin
                    )
                }

                setTimeout(
                    () => {
                        window.close()
                    },
                    result.warnings ? 4000 : 2000
                )
            } catch (error: any) {
                console.error("WABA callback error:", error)
                setStatus("error")

                const errorData = error.response?.data?.error || error
                const errorMessage =
                    errorData.message ||
                    error.message ||
                    "Failed to connect WhatsApp Business Account"
                const recoveryAction = errorData.recoveryAction
                const retryable = errorData.retryable !== false

                setMessage(errorMessage)

                if (window.opener) {
                    window.opener.postMessage(
                        {
                            type: "waba-connection-error",
                            error: errorMessage,
                            code: errorData.code,
                            retryable,
                            recoveryAction,
                        },
                        window.location.origin
                    )
                }
            }
        }

        handleCallback()
    }, [searchParams])

    const handleRetry = () => {
        window.close()
    }

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
                    <h2 className="text-xl font-semibold">Connecting WhatsApp...</h2>
                    <p className="text-sm text-muted-foreground">
                        Please wait while we complete the connection process
                    </p>
                </>
            )}

            {status === "success" && (
                <>
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-green-700">Success!</h2>
                    <p className="text-sm text-muted-foreground">{message}</p>
                    {wabaData && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left">
                            <p className="text-sm font-medium mb-2">Connected Account:</p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Name:</span> {wabaData.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium">WABA ID:</span>{" "}
                                <span className="font-mono text-xs">{wabaData.wabaId}</span>
                            </p>
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-4">
                        This window will close automatically...
                    </p>
                    <Button onClick={handleClose} variant="outline" className="mt-2">
                        Close Now
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

                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                        <p className="text-sm font-medium text-blue-800 mb-2">
                            What to do next:
                        </p>
                        <ul className="text-xs text-blue-700 space-y-2 list-disc list-inside">
                            <li>Click "Try Again" to restart the connection process</li>
                            <li>Make sure to grant all required permissions when prompted</li>
                            <li>Ensure you have a stable internet connection</li>
                            <li>If the issue persists, contact support</li>
                        </ul>
                    </div>

                    <div className="mt-4 p-3 bg-muted/50 rounded-lg text-left">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                            Common causes:
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• You cancelled the authorization</li>
                            <li>• Missing required permissions</li>
                            <li>• Authorization code expired (try again within 10 minutes)</li>
                            <li>• Network or server issues</li>
                        </ul>
                    </div>

                    <div className="flex gap-3 mt-6">
                        <Button onClick={handleRetry} variant="default" className="flex-1">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Try Again
                        </Button>
                        <Button onClick={handleClose} variant="outline" className="flex-1">
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
