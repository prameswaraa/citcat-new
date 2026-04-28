"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
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
const DEFAULT_REDIRECT_URI = "https://citcat.id/waba/callback"
const ALLOWED_MESSAGE_ORIGINS = new Set([
    "https://business.facebook.com",
    "https://www.facebook.com",
])

interface EmbeddedSignupResult {
    code: string
    sessionInfo: EmbeddedSignupSessionData
    redirectUri?: string
}

const ensureFacebookSdkLoaded = async (): Promise<void> => {
    if (typeof window === "undefined") return
    if (window.FB) return

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
    let parsedData = data

    if (typeof data === "string") {
        try {
            parsedData = JSON.parse(data)
        } catch {
            return null
        }
    }

    const events = Array.isArray(parsedData) ? parsedData : [parsedData]

    for (const item of events) {
        if (!item || typeof item !== "object") continue

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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function openResultPopupWindow(): Window | null {
    return window.open(
        "",
        "waba-embedded-signup-result",
        "width=760,height=720,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes"
    )
}

function writeResultPopup(popup: Window | null, result?: EmbeddedSignupResult): Window | null {
    const targetPopup = popup ?? openResultPopupWindow()

    if (!targetPopup) {
        return null
    }

    const code = escapeHtml(result?.code || "Waiting for Facebook authorization code...")
    const phoneNumberId = escapeHtml(result?.sessionInfo.phoneNumberId || "Waiting for phone_number_id...")
    const wabaId = escapeHtml(result?.sessionInfo.wabaId || "Waiting for waba_id...")
    const businessId = escapeHtml(result?.sessionInfo.businessId || "")
    const redirectUri = escapeHtml(result?.redirectUri || DEFAULT_REDIRECT_URI)
    const isWaiting = !result

    targetPopup.document.open()
    targetPopup.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>WABA Embedded Signup Result</title>
  <style>
    body { font-family: Arial, sans-serif; background: #0b1020; color: #e5e7eb; margin: 0; padding: 24px; }
    .card { max-width: 900px; margin: 0 auto; background: #111827; border: 1px solid #374151; border-radius: 12px; padding: 24px; }
    h1 { margin-top: 0; font-size: 22px; }
    p { color: #cbd5e1; }
    .row { margin-top: 18px; }
    .label { font-size: 13px; font-weight: 700; margin-bottom: 8px; color: #f8fafc; }
    .value { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 12px; }
    .actions { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
    button { background: #2563eb; color: white; border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 700; }
    button.secondary { background: #374151; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>Embedded Signup Result</h1>
    <p>${isWaiting ? "Menunggu hasil login Facebook/Meta. Jangan tutup popup ini dulu." : "Data dari Facebook/Meta sudah diterima. Silakan copy jika diperlukan."}</p>

    <div class="row">
      <div class="label">Authorization code</div>
      <div class="value" id="code">${code}</div>
    </div>

    <div class="grid">
      <div class="row">
        <div class="label">phone_number_id</div>
        <div class="value" id="phone_number_id">${phoneNumberId}</div>
      </div>
      <div class="row">
        <div class="label">waba_id</div>
        <div class="value" id="waba_id">${wabaId}</div>
      </div>
    </div>

    ${businessId ? `<div class="row"><div class="label">business_id</div><div class="value" id="business_id">${businessId}</div></div>` : ""}

    <div class="row">
      <div class="label">redirect_uri</div>
      <div class="value" id="redirect_uri">${redirectUri}</div>
    </div>

    <div class="actions">
      <button ${isWaiting ? "disabled" : ""} onclick="navigator.clipboard.writeText(document.getElementById('code').innerText)">Copy code</button>
      <button ${isWaiting ? "disabled" : ""} onclick="navigator.clipboard.writeText(document.getElementById('phone_number_id').innerText)">Copy phone_number_id</button>
      <button ${isWaiting ? "disabled" : ""} onclick="navigator.clipboard.writeText(document.getElementById('waba_id').innerText)">Copy waba_id</button>
      ${businessId ? `<button onclick="navigator.clipboard.writeText(document.getElementById('business_id').innerText)">Copy business_id</button>` : ""}
      <button ${isWaiting ? "disabled" : ""} onclick="navigator.clipboard.writeText(document.getElementById('redirect_uri').innerText)">Copy redirect_uri</button>
      <button class="secondary" onclick="window.close()">Close</button>
    </div>
  </div>
</body>
</html>`)
    targetPopup.document.close()
    return targetPopup
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
    const sessionInfoRef = useRef<EmbeddedSignupSessionData | null>(null)
    const resultPopupRef = useRef<Window | null>(null)
    const latestResultRef = useRef<EmbeddedSignupResult | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (ALLOWED_MESSAGE_ORIGINS.has(event.origin)) {
                const sessionInfo = parseEmbeddedSignupMessage(event.data)
                if (sessionInfo) {
                    sessionInfoRef.current = sessionInfo
                    localStorage.setItem(
                        "wabaEmbeddedSignupSession",
                        JSON.stringify({
                            ...sessionInfo,
                            savedAt: new Date().toISOString(),
                        })
                    )
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

                if (!embeddedCode || !sessionInfo?.phoneNumberId || !sessionInfo?.wabaId) {
                    const error = new Error(
                        "Missing authorization code or signup data. Please try connecting again."
                    )
                    toast({
                        variant: "destructive",
                        title: "Error",
                        description: getSafeErrorMessage(error, "Failed to receive Facebook result"),
                    })
                    if (onError) onError(error)
                    setLoading(false)
                    return
                }

                const result = { code: embeddedCode, sessionInfo }
                latestResultRef.current = result
                resultPopupRef.current = writeResultPopup(resultPopupRef.current, result)
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
                if (onError) onError(error)
            }
        }

        window.addEventListener("message", handleMessage)
        return () => window.removeEventListener("message", handleMessage)
    }, [onError, toast])

    const handleConnect = async () => {
        try {
            setLoading(true)
            sessionInfoRef.current = null
            latestResultRef.current = null
            resultPopupRef.current?.close()
            resultPopupRef.current = writeResultPopup(openResultPopupWindow())

            await ensureFacebookSdkLoaded()

            if (!window.FB) {
                throw new Error("Facebook SDK is not available.")
            }

            window.FB.login(
                (response) => {
                    try {
                        const code = response.authResponse?.code
                        const sessionInfo = sessionInfoRef.current

                        if (code && sessionInfo?.phoneNumberId && sessionInfo?.wabaId) {
                            const result = { code, sessionInfo }
                            latestResultRef.current = result
                            resultPopupRef.current = writeResultPopup(resultPopupRef.current, result)
                            setLoading(false)
                            return
                        }

                        setTimeout(() => {
                            const delayedSession = sessionInfoRef.current
                            if (code && delayedSession?.phoneNumberId && delayedSession?.wabaId) {
                                const result = { code, sessionInfo: delayedSession }
                                latestResultRef.current = result
                                resultPopupRef.current = writeResultPopup(resultPopupRef.current, result)
                            }
                            setLoading(false)
                        }, 1200)
                    } catch (error: any) {
                        setLoading(false)
                        toast({
                            variant: "destructive",
                            title: "Error",
                            description: getSafeErrorMessage(error, "Failed to connect WhatsApp"),
                        })
                        if (onError) onError(error)
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
            if (onError) onError(error)
        }
    }

    const handleSaveLatestResult = async () => {
        if (!latestResultRef.current) {
            const error = new Error("No Facebook result available yet.")
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message,
            })
            if (onError) onError(error)
            return
        }

        try {
            setLoading(true)
            const result = await wabaApi.completeEmbeddedSignup(
                latestResultRef.current.code,
                latestResultRef.current.sessionInfo
            )

            toast({
                title: "Success",
                description: "WhatsApp Business Account connected successfully!",
            })

            if (onSuccess) onSuccess(result.waba)
            if (onLoginComplete) onLoginComplete()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: getSafeErrorMessage(error, "Failed to save WhatsApp result"),
            })
            if (onError) onError(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
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

            <Button
                type="button"
                variant="outline"
                onClick={handleSaveLatestResult}
                disabled={loading || !latestResultRef.current}
            >
                Save latest result
            </Button>
        </div>
    )
}
