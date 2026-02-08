"use client"

import { useRef, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { IGMessageBubble } from "./ig-message-bubble"
import { RefreshCw } from "lucide-react"
import type { IGMessage } from "@/lib/api/instagram"

interface Props {
  messages: IGMessage[]
  loading: boolean
  onReact: (messageId: string) => Promise<void>
}

export function IGMessageList({ messages = [], loading, onReact }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Ensure messages is always an array
  const messageList = Array.isArray(messages) ? messages : []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messageList])

  if (loading && messageList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (messageList.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">No messages yet</p>
      </div>
    )
  }

  // Sort messages by timestamp
  const sortedMessages = [...messageList].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  // Group messages by date
  const groupedMessages: { [date: string]: IGMessage[] } = {}
  sortedMessages.forEach((message) => {
    const date = new Date(message.timestamp).toLocaleDateString()
    if (!groupedMessages[date]) {
      groupedMessages[date] = []
    }
    groupedMessages[date].push(message)
  })

  return (
    <ScrollArea className="h-full px-4 py-2">
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date}>
          {/* Date separator */}
          <div className="flex items-center justify-center my-4">
            <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
              {date === new Date().toLocaleDateString() ? "Today" : date}
            </div>
          </div>

          {/* Messages for this date */}
          {dateMessages.map((message) => (
            <IGMessageBubble
              key={message.id}
              message={message}
              onReact={() => onReact(message.id)}
            />
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </ScrollArea>
  )
}
