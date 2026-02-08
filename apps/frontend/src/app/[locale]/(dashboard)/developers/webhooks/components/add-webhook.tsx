"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MutateWebhook } from "./mutate-webhook"
import { useWebhooksContext } from "./webhooks-context"

export function AddWebhook() {
  const [open, setOpen] = useState(false)
  const { onWebhookCreated } = useWebhooksContext()

  return (
    <>
      <Button size="sm" variant="default" onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Add Webhook
      </Button>

      <MutateWebhook
        open={open}
        setOpen={setOpen}
        onSuccess={onWebhookCreated}
      />
    </>
  )
}
