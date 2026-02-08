"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { IconMail, IconRefresh, IconX } from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

interface Invitation {
  id: string
  email: string
  status: string
  createdAt: string
  expiresAt: string
}

interface PendingInvitationsProps {
  invitations: Invitation[]
  onCancel: (invitationId: string) => Promise<void>
  onResend: (invitationId: string) => Promise<void>
}

export function PendingInvitations({ 
  invitations, 
  onCancel, 
  onResend 
}: PendingInvitationsProps) {
  const t = useTranslations("team")
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [resendingId, setResendingId] = useState<string | null>(null)

  const handleCancelClick = (invitation: Invitation) => {
    setSelectedInvitation(invitation)
    setCancelDialogOpen(true)
  }

  const handleConfirmCancel = async () => {
    if (!selectedInvitation) return
    
    setIsCancelling(true)
    try {
      await onCancel(selectedInvitation.id)
    } finally {
      setIsCancelling(false)
      setCancelDialogOpen(false)
      setSelectedInvitation(null)
    }
  }

  const handleResend = async (invitation: Invitation) => {
    setResendingId(invitation.id)
    try {
      await onResend(invitation.id)
    } finally {
      setResendingId(null)
    }
  }

  if (invitations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <IconMail className="text-muted-foreground mb-4 h-10 w-10" />
        <p className="text-muted-foreground text-sm">{t("invitations.empty")}</p>
      </div>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("invitations.email")}</TableHead>
            <TableHead>{t("invitations.sentAt")}</TableHead>
            <TableHead>{t("invitations.expiresAt")}</TableHead>
            <TableHead className="text-right">{t("invitations.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(invitation.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell>
                {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResend(invitation)}
                    disabled={resendingId === invitation.id}
                  >
                    <IconRefresh className={`h-4 w-4 ${resendingId === invitation.id ? 'animate-spin' : ''}`} />
                    <span className="ml-1 hidden sm:inline">{t("invitations.resend")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelClick(invitation)}
                    className="text-destructive hover:text-destructive"
                  >
                    <IconX className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{t("invitations.cancel")}</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title={t("invitations.cancelConfirmTitle")}
        desc={t("invitations.cancelConfirmDescription", { 
          email: selectedInvitation?.email || "" 
        })}
        destructive
        handleConfirm={handleConfirmCancel}
        isLoading={isCancelling}
      />
    </>
  )
}
