"use client"

import { useState } from "react"
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
  Brain,
  Clock,
  UserPlus,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { useSession } from "@/lib/auth-client"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"
import { RoleGuard } from "@/components/auth/role-guard"
import { useWhatsAppPhoneNumbers } from "@/hooks/use-whatsapp-phone-numbers"
import {
  useAIConfig,
  useAIDocuments,
  useAIAgents,
} from "@/hooks/use-ai"

import { GeneralSettings } from "./components/general-settings"
import { KnowledgeBase } from "./components/knowledge-base"
import { AgentsList } from "./components/agents-list"
import { FilterSettings } from "./components/filter-settings"
import { HelpSection } from "./components/help-section"
import { ChatTest } from "./components/chat-test"
import { MemoryManagement } from "./components/memory-management"
import { WorkingHoursSettings } from "./components/working-hours-settings"
import { EscalationSettings } from "./components/escalation-settings"

export default function AIPage() {
  const { data: session, isPending } = useSession()

  // Multi-number support — phone numbers passed to AgentsList for assignment
  const { phoneNumbers } = useWhatsAppPhoneNumbers()

  // Get subscription tier
  const user = session?.user as any
  const tier = user?.subscriptionTier || user?.subscription?.tier || 'FREE'
  const isRestrictedUser = tier === 'FREE' || tier === 'BASIC'

  // Only fetch data if user has access
  const shouldFetchData = !isPending && !isRestrictedUser

  // TanStack Query hooks
  const { data: configData, isLoading: isLoadingConfig } = useAIConfig(undefined, shouldFetchData)
  const { data: documents = [], isLoading: isLoadingDocs } = useAIDocuments(shouldFetchData)
  const { data: agents = [], isLoading: isLoadingAgents } = useAIAgents(shouldFetchData)

  const config = configData?.data || {
    enabled: false,
    model: "gpt-4.1-nano-2025-04-14",
    systemPrompt: "",
    temperature: 0.7,
    filterWords: [],
  }

  const loading = isLoadingConfig || isLoadingDocs || isLoadingAgents

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
              <TabsTrigger value="memory" className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Memory
              </TabsTrigger>
              <TabsTrigger value="filter" className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Filters
              </TabsTrigger>
              <TabsTrigger value="working-hours" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Working Hours
              </TabsTrigger>
              <TabsTrigger value="escalation" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Escalation
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
                initialConfig={config}
                agents={agents}
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
              />
            )}
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <KnowledgeBase documents={documents} />
            )}
          </TabsContent>

          <TabsContent value="test" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <ChatTest agents={agents} />
            )}
          </TabsContent>

          <TabsContent value="memory" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <MemoryManagement phoneNumbers={phoneNumbers} />
            )}
          </TabsContent>

          <TabsContent value="filter" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <FilterSettings initialConfig={config} />
            )}
          </TabsContent>

          <TabsContent value="working-hours" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <WorkingHoursSettings initialConfig={config} phoneNumbers={phoneNumbers} />
            )}
          </TabsContent>

          <TabsContent value="escalation" className="space-y-6">
            {isRestrictedUser ? (
              <LockedContent />
            ) : (
              <EscalationSettings initialConfig={config} phoneNumbers={phoneNumbers} />
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