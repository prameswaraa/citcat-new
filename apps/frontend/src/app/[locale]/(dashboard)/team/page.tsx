"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IconUsersGroup } from "@tabler/icons-react"
import { useBusinessAccount } from "@/hooks/use-business-account"
import { TeamMembersList } from "./components/team-members-list"
import { PendingInvitations } from "./components/pending-invitations"
import { InviteAgentDialog } from "./components/invite-agent-dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/hooks/use-toast"
import { RoleGuard } from "@/components/auth/role-guard"
import { useSession } from "@/lib/auth-client"
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt"

interface TeamMember {
  id: string
  agentUserId: string | null
  status: "PENDING" | "ACTIVE" | "REMOVED"
  invitedAt: string
  joinedAt: string | null
  agent: {
    id: string
    name: string
    email: string
  } | null
}

interface Invitation {
  id: string
  email: string
  status: string
  createdAt: string
  expiresAt: string
}

interface AgentLimit {
  currentCount: number
  limit: number
  tier: string
  canInvite: boolean
}

export default function TeamPage() {
  const t = useTranslations("team")
  const { data: session, isPending: isSessionLoading } = useSession()
  const { userId, userRole, isLoading: isLoadingAccount } = useBusinessAccount()

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [agentLimit, setAgentLimit] = useState<AgentLimit | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"

  // Get subscription tier
  const user = session?.user as any
  const tier = user?.subscriptionTier || user?.subscription?.tier || 'FREE'
  const isFreeUser = tier === 'FREE'

  const loadTeamData = async () => {
    try {
      const [membersRes, invitationsRes, limitRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/team/members`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/team/invitations`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/team/limit`, { credentials: "include" }),
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        setTeamMembers(membersData.data || [])
      }

      if (invitationsRes.ok) {
        const invitationsData = await invitationsRes.json()
        setInvitations(invitationsData.data || [])
      }

      if (limitRes.ok) {
        const limitData = await limitRes.json()
        setAgentLimit(limitData.data)
      }
    } catch (error) {
      console.error("Error loading team data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Don't load data for FREE users - they'll see upgrade prompt
    if (isFreeUser) {
      setLoading(false)
      return
    }
    if (!isLoadingAccount && userId && userRole === "BUSINESS_OWNER") {
      loadTeamData()
    } else if (!isLoadingAccount) {
      setLoading(false)
    }
  }, [userId, userRole, isLoadingAccount, isFreeUser])

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/team/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        toast({ title: t("members.removeSuccess") })
        loadTeamData()
      } else {
        toast({ title: t("members.removeError"), variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t("members.removeError"), variant: "destructive" })
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/team/invitations/${invitationId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (response.ok) {
        toast({ title: t("invitations.cancelSuccess") })
        loadTeamData()
      } else {
        toast({ title: t("invitations.cancelError"), variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t("invitations.cancelError"), variant: "destructive" })
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/v1/team/invitations/${invitationId}/resend`, {
        method: "POST",
        credentials: "include",
      })

      if (response.ok) {
        toast({ title: t("invitations.resendSuccess") })
      } else {
        toast({ title: t("invitations.resendError"), variant: "destructive" })
      }
    } catch (error) {
      toast({ title: t("invitations.resendError"), variant: "destructive" })
    }
  }

  const handleInviteSuccess = () => {
    setInviteDialogOpen(false)
    loadTeamData()
  }

  // Show loading state while session or account is loading
  if (loading || isSessionLoading) {
    return (
      <>
        <Header />
        <div className="space-y-6 p-4">
          {/* Header skeleton */}
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>

          {/* Team Members Card skeleton */}
          <div className="border rounded-lg">
            <div className="p-6 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="px-6 pb-6">
              <div className="border rounded-lg">
                <div className="border-b p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border-b last:border-b-0 p-4">
                    <div className="flex gap-4 items-center">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Invitations Card skeleton */}
          <div className="border rounded-lg">
            <div className="p-6">
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="px-6 pb-6">
              <div className="border rounded-lg">
                <div className="border-b p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="border-b last:border-b-0 p-4">
                    <div className="flex gap-4 items-center">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 flex-1" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-8 w-16" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Show upgrade prompt for FREE users
  if (isFreeUser) {
    return (
      <RoleGuard>
        <Header />
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <IconUsersGroup className="h-7 w-7" />
              {t("title")}
            </h2>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <div className="max-w-md">
            <UpgradePrompt
              feature="teamManagement"
              currentTier={tier}
              requiredTier="BASIC"
            />
          </div>
        </div>
      </RoleGuard>
    )
  }

  // Filter active members only
  const activeMembers = teamMembers.filter(m => m.status === "ACTIVE")

  return (
    <RoleGuard>
      <Header />
      <div className="space-y-6 p-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("invite.button")}
          </Button>
        </div>

        {/* Team Members Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUsersGroup className="h-5 w-5" />
              {t("members.title")}
            </CardTitle>
            {agentLimit && (
              <CardDescription>
                {t("invite.currentCount", {
                  current: agentLimit.currentCount,
                  limit: agentLimit.limit
                })}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <TeamMembersList
              members={activeMembers}
              onRemove={handleRemoveMember}
            />
          </CardContent>
        </Card>

        {/* Pending Invitations Section */}
        <Card>
          <CardHeader>
            <CardTitle>{t("invitations.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingInvitations
              invitations={invitations}
              onCancel={handleCancelInvitation}
              onResend={handleResendInvitation}
            />
          </CardContent>
        </Card>
      </div>

      {/* Invite Agent Dialog */}
      <InviteAgentDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        onSuccess={handleInviteSuccess}
        agentLimit={agentLimit}
      />
    </RoleGuard>
  )
}
