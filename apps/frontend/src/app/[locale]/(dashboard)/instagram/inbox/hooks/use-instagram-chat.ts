import { useState, useEffect, useCallback } from "react"
import { instagramApi, type IGConversation, type IGMessage } from "@/lib/api/instagram"
import { useToast } from "@/hooks/use-toast"
import { useBusinessAccount } from "@/hooks/use-business-account"

export function useInstagramChat() {
  const [conversations, setConversations] = useState<IGConversation[]>([])
  const [messages, setMessages] = useState<IGMessage[]>([])
  const [selectedConversation, setSelectedConversation] = useState<IGConversation | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(true)

  const { userId, isLoading: isLoadingAccount } = useBusinessAccount()
  const { toast } = useToast()

  // Check Instagram connection status first
  const checkConnection = useCallback(async () => {
    try {
      setCheckingConnection(true)
      const status = await instagramApi.getConnectionStatus()
      setIsConnected(status.connected)
      return status.connected
    } catch (error) {
      console.error("Failed to check Instagram connection:", error)
      setIsConnected(false)
      return false
    } finally {
      setCheckingConnection(false)
    }
  }, [])

  const loadConversations = useCallback(async () => {
    // Don't load if not connected
    if (isConnected !== true) return
    
    try {
      setLoading(true)
      const response = await instagramApi.getConversations({ limit: 50 })
      setConversations(response.data || [])
    } catch (error: any) {
      // Check if it's a "not connected" error
      const errorMsg = error.message?.toLowerCase() || ""
      if (errorMsg.includes("not found") || errorMsg.includes("no connected")) {
        setIsConnected(false)
        return
      }
      console.error("Failed to load conversations:", error)
      // Only show toast for non-connection errors
      if (isConnected === true) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to load conversations",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [toast, isConnected])

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      setLoadingMessages(true)
      const response = await instagramApi.getMessages(conversationId, { limit: 100 })
      setMessages(response.data || [])
      
      // Mark as read
      await instagramApi.markAsRead(conversationId).catch(() => {})
    } catch (error: any) {
      console.error("Failed to load messages:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to load messages",
      })
    } finally {
      setLoadingMessages(false)
    }
  }, [toast])

  const selectConversation = useCallback(async (conversation: IGConversation) => {
    setSelectedConversation(conversation)
    await loadMessages(conversation.id)
  }, [loadMessages])

  const sendMessage = async (data: {
    type: "text" | "image" | "video" | "audio" | "sticker"
    text?: string
    mediaUrl?: string
  }) => {
    if (!selectedConversation) return false

    // Check messaging window
    if (!selectedConversation.isWindowActive) {
      toast({
        variant: "destructive",
        title: "Messaging Window Closed",
        description: "You can only reply within 24 hours of receiving a message from this user.",
      })
      return false
    }

    try {
      setSending(true)
      await instagramApi.sendMessage(selectedConversation.id, data)
      
      // Reload messages
      await loadMessages(selectedConversation.id)
      
      toast({
        title: "Success",
        description: "Message sent!",
      })
      
      return true
    } catch (error: any) {
      console.error("Failed to send message:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send message",
      })
      return false
    } finally {
      setSending(false)
    }
  }

  const sendReaction = async (messageId: string) => {
    try {
      await instagramApi.sendReaction(messageId, "love")
      await loadMessages(selectedConversation!.id)
    } catch (error: any) {
      console.error("Failed to send reaction:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reaction",
      })
    }
  }

  const searchConversations = async (query: string) => {
    if (!query.trim()) {
      await loadConversations()
      return
    }

    try {
      setLoading(true)
      const results = await instagramApi.searchConversations(query)
      setConversations(results)
    } catch (error: any) {
      console.error("Search failed:", error)
    } finally {
      setLoading(false)
    }
  }

  // Check connection and initial load
  useEffect(() => {
    if (!isLoadingAccount && userId) {
      checkConnection().then((connected) => {
        if (connected) {
          loadConversations()
        }
      })
    }
  }, [userId, isLoadingAccount, checkConnection, loadConversations])

  // Polling for new messages (only if connected)
  useEffect(() => {
    if (!userId || isLoadingAccount || isConnected !== true) return

    const interval = setInterval(() => {
      loadConversations()
      if (selectedConversation) {
        loadMessages(selectedConversation.id)
      }
    }, 10000) // Poll every 10 seconds

    return () => clearInterval(interval)
  }, [userId, isLoadingAccount, isConnected, selectedConversation, loadConversations, loadMessages])

  return {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation: selectConversation,
    loading,
    loadingMessages,
    sending,
    searchQuery,
    setSearchQuery,
    loadConversations,
    sendMessage,
    sendReaction,
    searchConversations,
    userId,
    isLoadingAccount,
    isConnected,
    checkingConnection,
  }
}
