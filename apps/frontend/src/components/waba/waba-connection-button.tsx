"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { CopyButton } from "@/components/copy-button"
import { Loader2 } from "lucide-react"
import {
    wabaApi,
    type EmbeddedSignupSessionData,
    type WABADetails,
} from "@/lib/api/waba-api"
import { useToast } from "@/hooks/use-toast"
import { getSafeErrorMessage } from "@/lib/error-utils"

declare global {
    interface Window {
        FB?: {
            init: (options: {
                appId: string
                autoLogAppEvents: boolean
                xfbml: boolean
                version: string
            }) => void
            login: (
                callback: (response: {
                    authResponse?: {
                        code?: string
                    }
                    status?: string
                }) => void,
                options: {
                    config_id: string
                    response_type: string
                    override_default_response_type: boolean
                    extras: {
                        version: string
                        featureType: string
                        features: Array<{ name: string }>
                    }
                }
            ) => void
        }
        fbAsyncInit?: () => void
    }
}

const FACEBOOK_APP_ID = "1025851416807430"
const FACEBOOK_CONFIG_ID = "1748856626487547"
const FACEBOOK_SDK_VERSION = "v25.0"
const ALLOWED_MESSAGE_ORIGINS = new Set([
    "https://business.facebook.com",
    "https://www.facebook.com",
])

interface EmbeddedSignupResult {
    code: string
    sessionInfo: EmbeddedSignupSessionData
}

const ensureFacebookSdkLoaded = async (): Promise<void> => {
    if (typeof window === "undefined") {
        return
    }

    if (window.FB) {
        return
    }

    await new Promise<void>((resolve, reject) => {
        const existingScript = document.querySelector(
            'script[data-facebook-sdk="true"]'
        ) as HTMLScriptElement | null

        window.fbAsyncInit = function () {
            if (!window.FB) {
                reject(new Error("Facebook SDK failed to initialize."))
                return
            }

            window.FB.init({
                appId: FACEBOOK_APP_ID,
                autoLogAppEvents: true,
                xfbml: true,
                version: FACEBOOK_SDK_VERSION,
            })

            resolve()
        }

        if (existingScript) {
            existingScript.addEventListener("error", () => {
                reject(new Error("Failed to load Facebook SDK."))
            })
            return
        }

        const script = document.createElement("script")
        script.async = true
        script.defer = true
        script.crossOrigin = "anonymous"
        script.src = "https://connect.facebook.net/en_US/sdk.js"
        script.dataset.facebookSdk = "true"
        script.onerror = () => reject(new Error("Failed to load Facebook SDK."))
        document.body.appendChild(script)
    })
}

function parseEmbeddedSignupMessage(data: unknown): EmbeddedSignupSessionData | null {
    const events = Array.isArray(data) ? data : [data]

    for (const item of events) {
        if (!item || typeof item !== "object") {
            continue
        }

        const event = item as {
            type?: string
            event?: string
            data?: {
                phone_number_id?: string
                waba_id?: string
                business_id?: string
            }
        }

        if (
            event.type === "WA_EMBEDDED_SIGNUP" &&
            event.event === "FINISH" &&
            event.data?.phone_number_id &&
            event.data?.waba_id
        ) {
            return {
                phoneNumberId: event.data.phone_number_id,
                wabaId: event.data.waba_id,
                businessId: event.data.business_id,
            }
        }
    }

    return null
}

interface WABAConnectionButtonProps {
    onSuccess?: (waba: WABADetails) => void
    onError?: (error: Error) => void
    onLoginComplete?: () => void
    className?: string
    enableCoexistence?: boolean
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    children?: React.ReactNode
}

export function WABAConnectionButton({
    onSuccess,
    onError,
    className,
    variant = "default",
    children,
    onLoginComplete,
}: WABAConnectionButtonProps) {
    const [loading, setLoading] = useState(false)
    const [resultDialogOpen, setResultDialogOpen] = useState(false)
    const [embeddedResult, setEmbeddedResult] = useState<EmbeddedSignupResult | null>(null)
    const sessionInfoRef = useRef<EmbeddedSignupSessionData | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (ALLOWED_MESSAGE_ORIGINS.has(event.origin)) {
                const sessionInfo = parseEmbeddedSignupMessage(event.data)
                if (sessionInfo) {
                    sessionInfoRef.current = sessionInfo
                    toast({
                        title: "Signup data received",
                        description: "Phone number ID and WABA ID saved.",
                    })
                }
                return
            }

            if (event.origin !== window.location.origin || !event.data) {
                return
            }

            if (event.data.type === "waba-embedded-signup-code") {
                const embeddedCode = event.data.code
                const sessionInfo = sessionInfoRef.current

                if (!embeddedCode) {
                    const error = new Error(
                        "Missing authorization code. Please try connecting again."
                    )
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: getSafeErrorMessage(error, "Failed to receive Facebook code"),
                    })
                    if (onError) onError(error)
                    setLoading(false)
                    return
                }

                if (!sessionInfo?.phoneNumberId || !sessionInfo?.wabaId) {
                    const error = new Error(
                        "Missing WhatsApp session info from Meta signup flow. Please complete the embedded signup flow again."
                    )
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: getSafeErrorMessage(error, "Failed to receive signup data"),
                    })
                    if (onError) onError(error)
                    setLoading(false)
                    return
                }

                setEmbeddedResult({
                    code: embeddedCode,
                    sessionInfo,
                })
                setResultDialogOpen(true)
                setLoading(false)
            }

            if (event.data.type === "waba-connection-error") {
                setLoading(false)
                const error = new Error(event.data.error || "Failed to connect WABA")

                toast({
                    variant: "destructive",
                    title: "Error",
                    description: getSafeErrorMessage(error, "Failed to connect WhatsApp"),
                })

                if (onError) {
                    onError(error)
                }
            }
        }

        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [onError, toast])

    const handleConnect = async () => {
        try {
            setLoading(true)
            sessionInfoRef.current = null
            setEmbeddedResult(null)
            setResultDialogOpen(false)

            await ensureFacebookSdkLoaded()

            if (!window.FB) {
                throw new Error("Facebook SDK is not available.")
            }

            window.FB.login(
                async (response) => {
                    try {
                        const code = response.authResponse?.code
                        if (!code) {
                            throw new Error(
                                "Missing authorization code. Please try connecting again."
                            )
                        }

                        const sessionInfo = sessionInfoRef.current
                        if (sessionInfo?.phoneNumberId && sessionInfo?.wabaId) {
                            setEmbeddedResult({ code, sessionInfo })
                            setResultDialogOpen(true)
                            setLoading(false)
                            return
                        }

                        // Fallback: callback page may send the code later via postMessage.
                    } catch (error: any) {
                        setLoading(false)
                        toast({
                            variant: "destructive",
                            title: "Error",
                            description: getSafeErrorMessage(error, "Failed to connect WhatsApp"),
                        })

                        if (onError) {
                            onError(error)
                        }
                    }
                },
                {
                    config_id: FACEBOOK_CONFIG_ID,
                    response_type: "code",
                    override_default_response_type: true,
                    extras: {
                        version: "v4",
                        featureType: "whatsapp_business_app_onboarding",
                        features: [{ name: "app_only_install" }],
                    },
                }
            )
        } catch (error: any) {
            setLoading(false)
            toast({
                variant: "destructive",
                title: "Error",
                description: getSafeErrorMessage(error, "Failed to connect WhatsApp"),
            })

            if (onError) {
                onError(error)
            }
        }
    }

    const handleSaveEmbeddedResult = async () => {
        if (!embeddedResult) {
            return
        }

        try {
            setLoading(true)
            const result = await wabaApi.completeEmbeddedSignup(
                embeddedResult.code,
                embeddedResult.sessionInfo
            )

            toast({
                title: "Success",
                description: "WhatsApp Business Account connected successfully!",
            })

            if (onSuccess) {
                onSuccess(result.waba)
            }

            if (onLoginComplete) {
                onLoginComplete()
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: getSafeErrorMessage(error, "Failed to connect WhatsApp"),
            })

            if (onError) {
                onError(error)
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
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

            <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Embedded Signup Result</DialogTitle>
                        <DialogDescription>
                            Facebook code, phone number ID, dan WABA ID sudah diterima.
                            Silakan copy jika diperlukan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium">Authorization code</p>
                                <CopyButton
                                    text={embeddedResult?.code || ""}
                                    aria-label="Copy authorization code"
                                />
                            </div>
                            <div className="rounded-md border bg-muted/40 p-3">
                                <p className="break-all font-mono text-xs text-muted-foreground">
                                    {embeddedResult?.code || "-"}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium">phone_number_id</p>
                                    <CopyButton
                                        text={embeddedResult?.sessionInfo.phoneNumberId || ""}
                                        aria-label="Copy phone number ID"
                                    />
                                </div>
                                <div className="rounded-md border bg-muted/40 p-3">
                                    <p className="break-all font-mono text-xs text-muted-foreground">
                                        {embeddedResult?.sessionInfo.phoneNumberId || "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium">waba_id</p>
                                    <CopyButton
                                        text={embeddedResult?.sessionInfo.wabaId || ""}
                                        aria-label="Copy WABA ID"
                                    />
                                </div>
                                <div className="rounded-md border bg-muted/40 p-3">
                                    <p className="break-all font-mono text-xs text-muted-foreground">
                                        {embeddedResult?.sessionInfo.wabaId || "-"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {embeddedResult?.sessionInfo.businessId && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium">business_id</p>
                                    <CopyButton
                                        text={embeddedResult.sessionInfo.businessId}
                                        aria-label="Copy business ID"
                                    />
                                </div>
                                <div className="rounded-md border bg-muted/40 p-3">
                                    <p className="break-all font-mono text-xs text-muted-foreground">
                                        {embeddedResult.sessionInfo.businessId}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setResultDialogOpen(false)}
                        >
                            Close
                        </Button>
                        <Button onClick={handleSaveEmbeddedResult} disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save to backend"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
