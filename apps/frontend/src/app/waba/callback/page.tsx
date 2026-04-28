"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/copy-button"
import { CheckCircle, XCircle, Loader2, RefreshCw } from "lucide-react"

interface EmbeddedSignupSession {
    phoneNumberId?: string
    wabaId?: string
    businessId?: string
    savedAt?: string
}

function getCurrentRedirectUri(): string {
    const url = new URL(window.location.href)
    url.searchParams.delete("code")
    url.searchParams.delete("state")
    return url.toString()
}

function getStoredSession(): EmbeddedSignupSession | null {
    try {
        const raw = localStorage.getItem("wabaEmbeddedSignupSession")
        if (!raw) return null
        return JSON.parse(raw) as EmbeddedSignupSession
    } catch {
        return null
    }
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

function openResultPopup(code: string, session: EmbeddedSignupSession | null, redirectUri: string): Window | null {
    const popup = window.open(
        "",
        "waba-embedded-signup-result",
        "width=760,height=720,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes"
    )

    if (!popup) return null

    const escapedCode = escapeHtml(code)
    const phoneNumberId = escapeHtml(session?.phoneNumberId || "")
    const wabaId = escapeHtml(session?.wabaId || "")
    const businessId = escapeHtml(session?.businessId || "")
    const escapedRedirectUri = escapeHtml(redirectUri)

    popup.document.open()
    popup.document.write(`<!DOCTYPE html>
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
    .value { background: #020617; border: 1px solid #334155; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 12px; min-height: 18px; }
    .actions { display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
    button { background: #2563eb; color: white; border: 0; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-weight: 700; }
    button.secondary { background: #374151; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .warn { background: #451a03; border: 1px solid #f59e0b; color: #fde68a; padding: 12px; border-radius: 8px; margin-top: 16px; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>Embedded Signup Result</h1>
    <p>Data dari Facebook/Meta sudah diterima. Silakan copy jika diperlukan.</p>
    ${!phoneNumberId || !wabaId ? `<div class="warn">Catatan: phone_number_id / waba_id belum ditemukan di localStorage. Pastikan event FINISH dari Meta sudah terkirim ke halaman utama sebelum callback selesai.</div>` : ""}

    <div class="row">
      <div class="label">Authorization code / access code</div>
      <div class="value" id="code">${escapedCode}</div>
    </div>

    <div class="grid">
      <div class="row">
        <div class="label">phone_number_id</div>
        <div class="value" id="phone_number_id">${phoneNumberId || "-"}</div>
      </div>
      <div class="row">
        <div class="label">waba_id</div>
        <div class="value" id="waba_id">${wabaId || "-"}</div>
      </div>
    </div>

    ${businessId ? `<div class="row"><div class="label">business_id</div><div class="value" id="business_id">${businessId}</div></div>` : ""}

    <div class="row">
      <div class="label">redirect_uri</div>
      <div class="value" id="redirect_uri">${escapedRedirectUri}</div>
    </div>

    <div class="actions">
      <button onclick="navigator.clipboard.writeText(document.getElementById('code').innerText)">Copy code</button>
      <button onclick="navigator.clipboard.writeText(document.getElementById('phone_number_id').innerText)">Copy phone_number_id</button>
      <button onclick="navigator.clipboard.writeText(document.getElementById('waba_id').innerText)">Copy waba_id</button>
      ${businessId ? `<button onclick="navigator.clipboard.writeText(document.getElementById('business_id').innerText)">Copy business_id</button>` : ""}
      <button onclick="navigator.clipboard.writeText(document.getElementById('redirect_uri').innerText)">Copy redirect_uri</button>
      <button class="secondary" onclick="window.close()">Close</button>
    </div>
  </div>
</body>
</html>`)
    popup.document.close()
    return popup
}

function WABACallbackContent() {
    const searchParams = useSearchParams()
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
    const [message, setMessage] = useState("")
    const [code, setCode] = useState("")
    const [session, setSession] = useState<EmbeddedSignupSession | null>(null)
    const [redirectUri, setRedirectUri] = useState("")
    const hasHandled = useRef(false)

    useEffect(() => {
        const handleCallback = async () => {
            if (hasHandled.current) return
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
                    throw new Error("Missing authorization code. Please try connecting again.")
                }

                const storedSession = getStoredSession()
                setCode(authCode)
                setSession(storedSession)
                const currentRedirectUri = getCurrentRedirectUri()
                setRedirectUri(currentRedirectUri)
                setStatus("success")
                setMessage("Authorization code received from Facebook.")

                openResultPopup(authCode, storedSession, currentRedirectUri)

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
                    error?.message || "Failed to receive authorization code from Facebook"
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

    const handleClose = () => window.close()
    const handleOpenPopupAgain = () => {
        if (code) openResultPopup(code, session, redirectUri || getCurrentRedirectUri())
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

                    <div className="mt-4 p-4 bg-muted/50 rounded-lg text-left space-y-4">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-sm font-medium">Authorization Code:</p>
                                <CopyButton text={code} />
                            </div>
                            <p className="text-xs break-all font-mono text-muted-foreground">
                                {code}
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-sm font-medium">phone_number_id:</p>
                                    <CopyButton text={session?.phoneNumberId || ""} />
                                </div>
                                <p className="text-xs break-all font-mono text-muted-foreground">
                                    {session?.phoneNumberId || "-"}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <p className="text-sm font-medium">waba_id:</p>
                                    <CopyButton text={session?.wabaId || ""} />
                                </div>
                                <p className="text-xs break-all font-mono text-muted-foreground">
                                    {session?.wabaId || "-"}
                                </p>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <p className="text-sm font-medium">redirect_uri:</p>
                                <CopyButton text={redirectUri} />
                            </div>
                            <p className="text-xs break-all font-mono text-muted-foreground">
                                {redirectUri || "-"}
                            </p>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-4">
                        Popup hasil otomatis dibuka. Jika browser memblokir popup, klik tombol di bawah.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button onClick={handleOpenPopupAgain} variant="default">
                            Open Result Popup
                        </Button>
                        <Button onClick={handleClose} variant="outline">
                            Close
                        </Button>
                    </div>
                </>
            )}

            {status === "error" && (
                <>
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-red-700">Connection Failed</h2>
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
            <Card className="w-full max-w-2xl">
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
