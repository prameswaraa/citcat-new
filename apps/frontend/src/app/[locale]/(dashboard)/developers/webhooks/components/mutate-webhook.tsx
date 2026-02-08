"use client"

import { Dispatch, SetStateAction, useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { IconCheck, IconCopy } from "@tabler/icons-react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  webhooksApi,
  type WebhookEndpoint,
  type WebhookEventType,
  type WebhookChannel,
} from "@/lib/api/webhooks-api"
import { webhookEventTypes, webhookChannels } from "../data/schema"

interface Props {
  open: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
  currentWebhook?: WebhookEndpoint
  onSuccess?: (webhook: WebhookEndpoint) => void
}

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  url: z.string().min(1, "URL is required").url("Please enter a valid URL"),
  events: z
    .array(z.enum(webhookEventTypes))
    .min(1, "Please select at least one event"),
  channels: z
    .array(z.enum(webhookChannels))
    .min(1, "Please select at least one channel"),
})
type MutateWebhookForm = z.infer<typeof formSchema>

const eventLabels: Record<WebhookEventType, string> = {
  "message.received": "Message Received",
  "message.sent": "Message Sent",
  "message.delivered": "Message Delivered",
  "message.read": "Message Read",
  "message.failed": "Message Failed",
}

const channelLabels: Record<WebhookChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  all: "All Channels",
}

export function MutateWebhook({ open, setOpen, currentWebhook, onSuccess }: Props) {
  const isEdit = !!currentWebhook
  const [isLoading, setIsLoading] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const form = useForm<MutateWebhookForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentWebhook
      ? {
          name: currentWebhook.name,
          url: currentWebhook.url,
          events: currentWebhook.events,
          channels: currentWebhook.channels,
        }
      : {
          name: "",
          url: "",
          events: [],
          channels: [],
        },
  })

  const onSubmit = async (data: MutateWebhookForm) => {
    try {
      setIsLoading(true)

      if (isEdit && currentWebhook) {
        const updated = await webhooksApi.update(currentWebhook.id, {
          name: data.name,
          url: data.url,
          events: data.events as WebhookEventType[],
          channels: data.channels as WebhookChannel[],
        })
        onSuccess?.(updated)
        toast({
          title: "Webhook Updated",
          description: "Your webhook endpoint has been updated successfully.",
        })
        handleClose()
      } else {
        const created = await webhooksApi.create({
          name: data.name,
          url: data.url,
          events: data.events as WebhookEventType[],
          channels: data.channels as WebhookChannel[],
        })
        
        if (created.secret) {
          setCreatedSecret(created.secret)
        }
        onSuccess?.(created)
        toast({
          title: "Webhook Created",
          description: "Your webhook endpoint has been created successfully.",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEdit ? "update" : "create"} webhook`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!createdSecret) return
    try {
      await navigator.clipboard.writeText(createdSecret)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast({
        title: "Copied!",
        description: "Webhook secret copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    form.reset()
    setCreatedSecret(null)
    setIsCopied(false)
    setOpen(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(e) => {
        if (!e) {
          handleClose()
        } else {
          setOpen(e)
        }
      }}
    >
      <SheetContent className="flex w-full max-w-none flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {createdSecret
              ? "Webhook Created"
              : isEdit
              ? "Update Webhook"
              : "New Webhook"}
          </SheetTitle>
          <SheetDescription>
            {createdSecret
              ? "Your webhook has been created. Copy the secret now - you won't be able to see it again!"
              : isEdit
              ? "Update your webhook endpoint configuration."
              : "Setup your webhook endpoint to receive live events."}
          </SheetDescription>
        </SheetHeader>

        {createdSecret ? (
          <div className="flex-1 space-y-4 p-2">
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                This is the only time you'll see this secret. Store it securely
                to verify webhook signatures!
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook Secret</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={createdSecret}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {isCopied ? (
                    <IconCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <IconCopy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                Use this secret to verify webhook signatures using HMAC-SHA256.
              </p>
            </div>

            <SheetFooter className="mt-4">
              <Button onClick={handleClose}>Done</Button>
            </SheetFooter>
          </div>
        ) : (
          <Form {...form}>
            <form
              id="webhook"
              onSubmit={form.handleSubmit(onSubmit)}
              className="no-scrollbar -mx-2 flex-1 space-y-5 overflow-y-auto p-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., n8n Production" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>URL Endpoint</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://your-server.com/webhook" />
                    </FormControl>
                    <FormDescription>
                      HTTPS is required for production environments.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="events"
                render={() => (
                  <FormItem className="space-y-1">
                    <FormLabel>Events</FormLabel>
                    <FormDescription>
                      Select which events should trigger this webhook.
                    </FormDescription>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {webhookEventTypes.map((event) => (
                        <FormField
                          key={event}
                          control={form.control}
                          name="events"
                          render={({ field }) => {
                            return (
                              <FormItem key={event}>
                                <FormLabel
                                  className={cn(
                                    "flex flex-row items-start space-y-0 space-x-2",
                                    "border-border cursor-pointer rounded-lg border p-3",
                                    "[&:has([aria-checked=true])]:border-blue-500",
                                    "[&_button[aria-checked=true]]:bg-blue-500 [&_button[aria-checked=true]]:border-blue-500",
                                    "[&:has(button[aria-invalid=true])]:border-destructive"
                                  )}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(event)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, event])
                                          : field.onChange(
                                              field.value?.filter((v) => v !== event)
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="text-sm font-medium">
                                    {eventLabels[event]}
                                  </div>
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="channels"
                render={() => (
                  <FormItem className="space-y-1">
                    <FormLabel>Channels</FormLabel>
                    <FormDescription>
                      Filter events by messaging channel.
                    </FormDescription>
                    <div className="grid grid-cols-3 gap-2">
                      {webhookChannels.map((channel) => (
                        <FormField
                          key={channel}
                          control={form.control}
                          name="channels"
                          render={({ field }) => {
                            return (
                              <FormItem key={channel}>
                                <FormLabel
                                  className={cn(
                                    "flex flex-row items-center justify-center space-y-0 space-x-2",
                                    "border-border cursor-pointer rounded-lg border p-3",
                                    "[&:has([aria-checked=true])]:border-blue-500",
                                    "[&_button[aria-checked=true]]:bg-blue-500 [&_button[aria-checked=true]]:border-blue-500",
                                    "[&:has(button[aria-invalid=true])]:border-destructive"
                                  )}
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(channel)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, channel])
                                          : field.onChange(
                                              field.value?.filter((v) => v !== channel)
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <div className="text-sm font-medium">
                                    {channelLabels[channel]}
                                  </div>
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {!createdSecret && (
          <SheetFooter className="gap-2">
            <SheetClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </SheetClose>
            <Button form="webhook" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEdit ? "Updating..." : "Creating..."}
                </>
              ) : isEdit ? (
                "Update Webhook"
              ) : (
                "Create Webhook"
              )}
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
