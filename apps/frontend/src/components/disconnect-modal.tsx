"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { AlertTriangle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

type DisconnectMode = "soft" | "hard"

interface DisconnectModalProps {
  isOpen: boolean
  onClose: () => void
  channel: "whatsapp" | "instagram"
  onConfirm: (mode: DisconnectMode) => void
  isLoading?: boolean
}

export function DisconnectModal({
  isOpen,
  onClose,
  channel,
  onConfirm,
  isLoading = false,
}: DisconnectModalProps) {
  const t = useTranslations("settings.disconnect")
  const tCommon = useTranslations("common")
  
  const [mode, setMode] = useState<DisconnectMode>("soft")
  const [confirmText, setConfirmText] = useState("")

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMode("soft")
      setConfirmText("")
    }
  }, [isOpen])

  const channelName = channel === "whatsapp" ? "WhatsApp" : "Instagram"
  const isHardMode = mode === "hard"
  const isConfirmDisabled = isHardMode && confirmText !== "DELETE"

  const handleConfirm = () => {
    if (isConfirmDisabled) return
    onConfirm(mode)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("title", { channel: channelName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("description")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={mode}
            onValueChange={(value) => setMode(value as DisconnectMode)}
            className="space-y-3"
          >
            {/* Soft disconnect option */}
            <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                 onClick={() => setMode("soft")}>
              <RadioGroupItem value="soft" id="soft" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="soft" className="font-medium cursor-pointer">
                  {t("softMode.title")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("softMode.description")}
                </p>
              </div>
            </div>

            {/* Hard disconnect option */}
            <div className="flex items-start space-x-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50 border-destructive/50"
                 onClick={() => setMode("hard")}>
              <RadioGroupItem value="hard" id="hard" className="mt-0.5" />
              <div className="space-y-1">
                <Label htmlFor="hard" className="font-medium cursor-pointer text-destructive">
                  {t("hardMode.title")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("hardMode.description")}
                </p>
              </div>
            </div>
          </RadioGroup>

          {/* Hard mode confirmation */}
          {isHardMode && (
            <div className="space-y-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">
                  {t("hardMode.warning")}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-sm">
                  {t("hardMode.confirmLabel")}
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <Button
            variant={isHardMode ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isLoading}
          >
            {isLoading ? t("disconnecting") : t("confirm")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
