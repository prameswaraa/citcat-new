"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Bot, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AIAgent, KnowledgeDocument } from "@/lib/api/ai-api"
import { AgentDialog } from "./agent-dialog"
import type { WhatsAppPhoneNumberOption } from "@/hooks/use-whatsapp-phone-numbers"
import { IconBrandWhatsapp } from "@tabler/icons-react"

interface AgentsListProps {
  agents: AIAgent[]
  documents: KnowledgeDocument[]
  phoneNumbers: WhatsAppPhoneNumberOption[]
  onCreate: (data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds: string[] }) => Promise<void>
  onUpdate: (id: string, data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds: string[] }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function AgentsList({ agents, documents, phoneNumbers, onCreate, onUpdate, onDelete }: AgentsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | undefined>(undefined)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [agentToDelete, setAgentToDelete] = useState<AIAgent | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = () => {
    setSelectedAgent(undefined)
    setDialogOpen(true)
  }

  const handleEdit = (agent: AIAgent) => {
    setSelectedAgent(agent)
    setDialogOpen(true)
  }

  const handleSave = async (data: { name: string; systemPrompt: string; documentIds: string[]; assignedPhoneNumberIds: string[] }) => {
    if (selectedAgent) {
      await onUpdate(selectedAgent.id, data)
    } else {
      await onCreate(data)
    }
  }

  const handleDeleteClick = (agent: AIAgent) => {
    setAgentToDelete(agent)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return
    setIsDeleting(true)
    try {
      await onDelete(agentToDelete.id)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setAgentToDelete(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>AI Agents</CardTitle>
          <CardDescription>
            Create and manage different AI personalities for various purposes.
          </CardDescription>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </CardHeader>
      <CardContent>
        {agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-4 rounded-full bg-muted">
              <Bot className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">No agents created yet</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Create your first AI agent to start automating responses with specific personalities and knowledge.
              </p>
            </div>
            <Button onClick={handleCreate}>Create Agent</Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>System Prompt</TableHead>
                <TableHead>Knowledge</TableHead>
                {phoneNumbers.length > 0 && <TableHead>Assigned Numbers</TableHead>}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      {agent.name}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {agent.systemPrompt}
                  </TableCell>
                  <TableCell>
                    {agent.knowledgeDocumentCount || 0} documents
                  </TableCell>
                  {phoneNumbers.length > 0 && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(agent.assignedPhoneNumberIds || []).length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          agent.assignedPhoneNumberIds!.map((accountId) => {
                            const pn = phoneNumbers.find(p => p.whatsappAccountId === accountId)
                            return pn ? (
                              <Badge key={accountId} variant="secondary" className="text-xs gap-1">
                                <IconBrandWhatsapp className="h-3 w-3 text-green-500" />
                                {pn.displayPhoneNumber}
                              </Badge>
                            ) : null
                          })
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(agent)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteClick(agent)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <AgentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          agent={selectedAgent}
          documents={documents}
          phoneNumbers={phoneNumbers}
          onSave={handleSave}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <AlertDialogTitle>Delete Agent</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="pt-2">
                Are you sure you want to delete <strong>{agentToDelete?.name}</strong>?
                <br /><br />
                This action cannot be undone. The agent and all its configurations will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Delete Agent"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}