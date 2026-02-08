"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useBusinessAccount } from "@/hooks/use-business-account"
import { instagramApi, type InstagramAccount, type TokenStatus } from "@/lib/api/instagram"
import { DisconnectModal } from "@/components/disconnect-modal"
import { RoleGuard } from "@/components/auth/role-guard"
import { 
  InstagramConnectionCard,
  InstagramAccountCard,
  InstagramConnectCard,
  InstagramWebhookCard
} from "./components"
import {
  IconSettings,
  IconBrandInstagram,
  IconWebhook,
} from "@tabler/icons-react"

export default function InstagramPage() {
  const { userId, isLoading: sessionLoading } = useBusinessAccount()
  const [account, setAccount] = useState<InstagramAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const isConnected = account?.connectionStatus === "connected"

  useEffect(() => {
    if (userId) {
      loadInstagramData()
    }
  }, [userId])

  const loadInstagramData = async () => {
    setLoading(true)
    setError(null)
    try {
      const status = await instagramApi.getConnectionStatus()
      setAccount(status.account)
    } catch (err: any) {
      console.error("Error loading Instagram data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      const { url } = await instagramApi.getAuthUrl()

      // Open OAuth in popup window
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        url,
        "Instagram OAuth",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
      )

      if (!popup) {
        setError("Pop-up was blocked. Please allow pop-ups for this site and try again.")
        return
      }

      // Listen for OAuth callback result
      const handleMessage = (event: MessageEvent) => {
        // Validate origin for security
        if (event.origin !== window.location.origin) return

        const { type, success, username, error: errorMsg } = event.data

        if (type === "instagram-oauth-result") {
          window.removeEventListener("message", handleMessage)

          if (success) {
            // Reload Instagram data after successful connection
            loadInstagramData()
          } else {
            // Show error from OAuth flow
            setError(errorMsg || "Failed to connect Instagram account")
          }
        }
      }

      window.addEventListener("message", handleMessage)

      // Cleanup listener if popup is closed manually
      const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupClosed)
          window.removeEventListener("message", handleMessage)
        }
      }, 500)
    } catch (err: any) {
      console.error("Error getting auth URL:", err)
      setError(err.message)
    }
  }

  const handleOpenDisconnectModal = () => {
    setDisconnectModalOpen(true)
  }

  const handleDisconnect = async (mode: "soft" | "hard") => {
    try {
      setDisconnecting(true)
      await instagramApi.disconnect(mode)
      setDisconnectModalOpen(false)
      setAccount(null)
    } catch (err: any) {
      console.error("Error disconnecting:", err)
      setError(err.message)
    } finally {
      setDisconnecting(false)
    }
  }

  if (sessionLoading || loading) {
    return (
      <>
        <Header />
        <div className="space-y-4 p-4">
          <div className="animate-pulse space-y-4">
            <div className="bg-muted h-8 w-64 rounded"></div>
            <div className="bg-muted h-48 w-full rounded"></div>
          </div>
        </div>
      </>
    )
  }

  return (
    <RoleGuard>
      <Header />
      <div className="space-y-6 p-4">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconBrandInstagram className="h-7 w-7" />
            Instagram Direct Messages
          </h2>
          <p className="text-muted-foreground">
            Connect your Instagram Professional account to manage DMs
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200">
            {error}
          </div>
        )}


        {/* Connect Card (if not connected) */}
        {!isConnected && (
          <div className="max-w-2xl">
            <InstagramConnectCard 
              onConnect={handleConnect}
              requiresReauth={account?.connectionStatus === "requires_reauth"}
            />
          </div>
        )}

        {/* Instagram Management (if connected) */}
        {isConnected && account && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="w-full justify-start overflow-x-auto md:w-auto">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <IconSettings size={14} />
                Overview
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <IconWebhook size={16} />
                Webhooks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <InstagramConnectionCard
                account={account}
                onRefresh={loadInstagramData}
                onDisconnect={handleOpenDisconnectModal}
              />
              <InstagramAccountCard account={account} />
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-4">
              <div className="max-w-2xl">
                <InstagramWebhookCard />
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Disconnect Modal */}
        <DisconnectModal
          isOpen={disconnectModalOpen}
          onClose={() => setDisconnectModalOpen(false)}
          channel="instagram"
          onConfirm={handleDisconnect}
          isLoading={disconnecting}
        />
      </div>
    </RoleGuard>
  )
}
