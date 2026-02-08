"use client"

import { useState } from "react"
import { EllipsisVertical, Loader2 } from "lucide-react"
import { useRouter } from "@/i18n/routing"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { webhooksApi, type WebhookEndpoint } from "@/lib/api/webhooks-api"
import { MutateWebhook } from "../../components/mutate-webhook"

interface Props {
  webhook: WebhookEndpoint
  onUpdated: (webhook: WebhookEndpoint) => void
  onDeleted: () => void
}

export function WebhookDetailActions({ webhook, onUpdated, onDeleted }: Props) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDisable = async () => {
    try {
      setIsDisabling(true)
      const updated = await webhooksApi.update(webhook.id, {
        isActive: !webhook.isActive,
      })
      onUpdated(updated)
      toast({
        title: webhook.isActive ? "Webhook Disabled" : "Webhook Enabled",
        description: `"${webhook.name}" has been ${webhook.isActive ? "disabled" : "enabled"}.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update webhook",
        variant: "destructive",
      })
    } finally {
      setIsDisabling(false)
      setDisableOpen(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await webhooksApi.delete(webhook.id)
      toast({
        title: "Webhook Deleted",
        description: `"${webhook.name}" has been deleted successfully.`,
      })
      onDeleted()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete webhook",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="outline" className="scale-75">
            <EllipsisVertical size={16} />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right" className="w-[160px]">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            Update details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDisableOpen(true)}>
            {webhook.isActive ? "Disable" : "Enable"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setDeleteOpen(true)}
            className="text-red-500!"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MutateWebhook
        open={editOpen}
        setOpen={setEditOpen}
        currentWebhook={webhook}
        onSuccess={onUpdated}
      />

      <ConfirmDialog
        key="disable-webhook"
        className="max-w-sm"
        open={disableOpen}
        onOpenChange={setDisableOpen}
        handleConfirm={handleDisable}
        isLoading={isDisabling}
        title={webhook.isActive ? "Disable Webhook" : "Enable Webhook"}
        desc={`Are you sure you want to ${webhook.isActive ? "disable" : "enable"} this webhook?`}
        confirmText={
          isDisabling ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {webhook.isActive ? "Disabling..." : "Enabling..."}
            </>
          ) : webhook.isActive ? (
            "Disable webhook"
          ) : (
            "Enable webhook"
          )
        }
      />

      <ConfirmDialog
        key="delete-webhook"
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        handleConfirm={handleDelete}
        isLoading={isDeleting}
        title="Delete Webhook"
        desc="Are you sure you want to delete this webhook? This action cannot be undone, and no future webhooks will be sent to this URL."
        confirmText={
          isDeleting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Deleting...
            </>
          ) : (
            "Delete"
          )
        }
        destructive
      />
    </>
  )
}
