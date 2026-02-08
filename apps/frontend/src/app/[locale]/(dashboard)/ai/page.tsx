"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  BrainCircuit,
  Settings,
  HelpCircle,
  Ban,
  Loader2,
  Bot,
  MessageSquare,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { useToast } from "@/hooks/use-toast"
import { aiApi, AIConfig, KnowledgeDocument, AIAgent } from "@/lib/api/ai-api"
import { useSession } from "@/lib/auth-client"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"
import { RoleGuard } from "@/components/auth/role-guard"
import { useWhatsAppPhoneNumbers } from "@/hooks/use-whatsapp-phone-numbers"

import { GeneralSettings } from "./components/general-settings"
import { KnowledgeBase } from "./components/knowledge-base"
import { AgentsList } from "./components/agents-list"
import { FilterSettings } from "./components/filter-settings"
import { HelpSection } from "./components/help-section"
import { ChatTest } from "./components/chat-test"

export default function AIPage() {
  const { data: session, isPending } = useSession()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Multi-number support — phone numbers passed to AgentsList for assignment
  const { phoneNumbers } = useWhatsAppPhoneNumbers()

  const [config, setConfig] = useState<AIConfig>({
    enabled: false,
    model: "gpt-4.1-nano-2025-04-14",
    systemPrompt: "",
    temperature: 0.7,
    filterWords: [],
  })

  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  const [agents, setAgents] = useState<AIAgent[]>([])

  useEffect(() => {
    if (session?.user) {
      const user = session.user as any
      const tier = user.subscriptionTier || user.subscription?.tier || 'FREE'

      if (tier === 'FREE' || tier === 'BASIC') {
        setLoading(false)
        return
      }
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [configResult, docsData, agentsData] = await Promise.all([
        aiApi.getConfig(),
        aiApi.getDocuments(),
        aiApi.getAgents(),
      ])
      setConfig(configResult.data)
      setDocuments(docsData)
      setAgents(agentsData)
    } catch (error) {
      console.error(error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load AI settings",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setSaving(true)
      await aiApi.updateConfig(config)
      toast({
        title: "Success",
        description: "AI settings saved successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Only PDF files are supported",
      })
      return
    }

    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`
    const optimisticDoc: KnowledgeDocument = {
      id: tempId,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    }

    // Optimistic: add to list immediately
    setDocuments((prev) => [optimisticDoc, ...prev])
    setUploading(true)

    // Reset input early
    e.target.value = ""

    try {
      const result = await aiApi.uploadDocument(file)
      const uploadedDoc = result.document || result.data || result

      // Replace temp doc with real doc, preserve createdAt if missing
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === tempId
            ? {
                ...uploadedDoc,
                status: "PROCESSING" as const,
                createdAt: uploadedDoc.createdAt || d.createdAt,
              }
            : d
        )
      )

      toast({
        title: "Success",
        description: "File uploaded. Processing...",
      })

      // Start polling for status
      pollDocumentStatus(uploadedDoc.id)
    } catch (error) {
      // Rollback: remove optimistic doc
      setDocuments((prev) => prev.filter((d) => d.id !== tempId))
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload file",
      })
    } finally {
      setUploading(false)
    }
  }

  const pollDocumentStatus = async (docId: string) => {
    const maxAttempts = 60 // 5 minutes max (60 * 5s)
    let attempts = 0

    const poll = async () => {
      try {
        const docs = await aiApi.getDocuments()
        const doc = docs.find((d: KnowledgeDocument) => d.id === docId)

        if (!doc) return // Document was deleted

        // Update document in state
        setDocuments((prev) => prev.map((d) => (d.id === docId ? doc : d)))

        // Continue polling if still processing
        if (doc.status === "PROCESSING" || doc.status === "PENDING") {
          attempts++
          if (attempts < maxAttempts) {
            setTimeout(poll, 5000) // Poll every 5 seconds
          }
        } else if (doc.status === "COMPLETED") {
          toast({
            title: "Processing Complete",
            description: `${doc.filename} is ready to use.`,
          })
        } else if (doc.status === "FAILED") {
          toast({
            variant: "destructive",
            title: "Processing Failed",
            description: doc.errorMessage || `Failed to process ${doc.filename}`,
          })
        }
      } catch (error) {
        console.error("Error polling document status:", error)
      }
    }

    // Start polling after short delay
    setTimeout(poll, 3000)
  }

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    // Optimistic: remove from list immediately
    const docToDelete = documents.find((d) => d.id === id)
    setDocuments((prev) => prev.filter((d) => d.id !== id))

    try {
      await aiApi.deleteDocument(id)
      toast({
        title: "Success",
        description: "Document deleted",
      })
    } catch (error) {
      // Rollback: restore the document
      if (docToDelete) {
        setDocuments((prev) => [docToDelete, ...prev])
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete document",
      })
    }
  }

  const handleCreateAgent = async (data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds: string[] }) => {
    try {
      const newAgent = await aiApi.createAgent(data)
      setAgents([newAgent, ...agents])
      toast({
        title: "Success",
        description: "Agent created successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create agent",
      })
    }
  }

  const handleUpdateAgent = async (id: string, data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds: string[] }) => {
    try {
      const updatedAgent = await aiApi.updateAgent(id, data)
      setAgents(agents.map((a) => (a.id === id ? updatedAgent : a)))
      toast({
        title: "Success",
        description: "Agent updated successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update agent",
      })
    }
  }

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this agent?")) return

    try {
      await aiApi.deleteAgent(id)
      setAgents(agents.filter((a) => a.id !== id))

      // If active agent was deleted, update config
      if (config.activeAgentId === id) {
        setConfig({ ...config, activeAgentId: undefined })
        await aiApi.updateConfig({ ...config, activeAgentId: undefined })
      }

      toast({
        title: "Success",
        description: "Agent deleted successfully",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete agent",
      })
    }
  }

  // Check loading state (both initial and session)
  if (loading || isPending) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-full p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </>
    )
  }

  const user = session?.user as any
  const tier = user?.subscriptionTier || user?.subscription?.tier || 'FREE'
  // FREE and BASIC users cannot access AI features - requires LITE or above
  const isRestrictedUser = tier === 'FREE' || tier === 'BASIC'

  // Locked content component for FREE users
  const LockedContent = () => (
    <div className="max-w-md">
      <UpgradePrompt
        feature="aiChatbot"
        currentTier={tier}
        requiredTier="LITE"
      />
    </div>
  )

  return (
    <RoleGuard>
      <Header />
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <BrainCircuit className="h-7 w-7" />
            AI Auto-Reply
          </h2>
          <p className="text-muted-foreground">
            Configure your AI assistant and manage its knowledge base.
          </p>
        </div>

        <Tabs defaultValue="settings" className="space-y-4">
          <div className="w-full overflow-x-auto pb-2">
            <TabsList>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                General Settings
              </TabsTrigger>
              <TabsTrigger value="agents" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Knowledge Base
              </TabsTrigger>
              <TabsTrigger value="test" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Test Chatbot
              </TabsTrigger>
              <TabsTrigger value="filter" className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="help" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Contoh Prompt
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="settings" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <GeneralSettings
                config={config}
                agents={agents}
                setConfig={setConfig}
                onSave={handleSaveConfig}
                saving={saving}
              />
            )}
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <AgentsList
                agents={agents}
                documents={documents}
                phoneNumbers={phoneNumbers}
                onCreate={handleCreateAgent}
                onUpdate={handleUpdateAgent}
                onDelete={handleDeleteAgent}
              />
            )}
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <KnowledgeBase
                documents={documents}
                uploading={uploading}
                onUpload={handleFileUpload}
                onDelete={handleDeleteDocument}
              />
            )}
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <ChatTest agents={agents} />
            )}
          </TabsContent>

          <TabsContent value="filter" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <FilterSettings
                config={config}
                setConfig={setConfig}
                onSave={handleSaveConfig}
                saving={saving}
              />
            )}
          </TabsContent>

          <TabsContent value="help" className="space-y-6">
            <HelpSection />
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  )
}