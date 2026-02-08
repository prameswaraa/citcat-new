"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { IconAlertTriangle, IconArrowUp } from "@tabler/icons-react"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface AgentLimit {
  currentCount: number
  limit: number
  tier: string
  canInvite: boolean
}

interface InviteAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  agentLimit: AgentLimit | null
}

export function InviteAgentDialog({
  open,
  onOpenChange,
  onSuccess,
  agentLimit,
}: InviteAgentDialogProps) {
  const t = useTranslations("team")
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiUrl}/api/v1/team/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: t("invite.success") })
        setEmail("")
        onSuccess()
      } else {
        const errorCode = data.error?.code
        if (errorCode === "AGENT_LIMIT_REACHED") {
          setError(t("invite.limitReachedDescription", {
            limit: agentLimit?.limit || 0,
            tier: agentLimit?.tier || "FREE",
          }))
        } else if (errorCode === "INVITATION_EXISTS") {
          setError("An invitation has already been sent to this email")
        } else if (errorCode === "ALREADY_AGENT") {
          setError("This user is already an agent on your team")
        } else {
          setError(data.error?.message || t("invite.error"))
        }
      }
    } catch (err) {
      setError(t("invite.error"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpgrade = () => {
    onOpenChange(false)
    router.push("/subscription")
  }

  const canInvite = agentLimit?.canInvite ?? true
  const isLimitReached = !canInvite

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invite.title")}</DialogTitle>
          <DialogDescription>{t("invite.description")}</DialogDescription>
        </DialogHeader>

        {isLimitReached ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <IconAlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("invite.limitReached")}</AlertTitle>
              <AlertDescription>
                {t("invite.limitReachedDescription", {
                  limit: agentLimit?.limit || 0,
                  tier: agentLimit?.tier || "FREE",
                })}
              </AlertDescription>
            </Alert>
            <Button onClick={handleUpgrade} className="w-full">
              <IconArrowUp className="mr-2 h-4 w-4" />
              {t("invite.upgradePrompt")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {agentLimit && (
                <p className="text-muted-foreground text-sm">
                  {t("invite.currentCount", {
                    current: agentLimit.currentCount,
                    limit: agentLimit.limit,
                  })}
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t("invite.emailLabel")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("invite.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <IconAlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t("invite.cancel") || "Cancel"}
              </Button>
              <Button type="submit" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? t("invite.sending") : t("invite.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
