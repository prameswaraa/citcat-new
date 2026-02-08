"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCw,
  Users,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAdminSubscriptions, type PendingPayment, type ExpiringSubscription } from "../../hooks/use-admin-subscriptions"

function getTierBadgeColor(tier: string) {
  switch (tier) {
    case "PRO":
      return "bg-purple-100 text-purple-800 border-purple-200"
    case "LITE":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "FREE":
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function TierCard({
  tier,
  count,
  total,
  icon: Icon,
  color,
  isLoading,
}: {
  tier: string
  count: number
  total: number
  icon: typeof Users
  color: string
  isLoading?: boolean
}) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-12 mb-1" />
          <Skeleton className="h-3 w-24" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{tier} Tier</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">
          {percentage}% of total subscriptions
        </p>
      </CardContent>
    </Card>
  )
}

function StatusCard({
  status,
  count,
  icon: Icon,
  color,
  isLoading,
}: {
  status: string
  count: number
  icon: typeof CheckCircle
  color: string
  isLoading?: boolean
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-12" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{status}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count.toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}

function PendingPaymentsTable({
  payments,
  isLoading,
  onApprove,
  onRowClick,
}: {
  payments: PendingPayment[]
  isLoading?: boolean
  onApprove: (payment: PendingPayment) => void
  onRowClick: (userId: string) => void
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Payments</CardTitle>
          <CardDescription>Subscriptions awaiting payment approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pending Payments
        </CardTitle>
        <CardDescription>
          {payments.length} subscription{payments.length !== 1 ? "s" : ""} awaiting payment approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No pending payments
          </p>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex flex-col gap-3 p-3 border rounded-lg"
              >
                <div 
                  className="flex items-start justify-between gap-2 cursor-pointer"
                  onClick={() => onRowClick(payment.userId)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{payment.userName}</div>
                    <div className="text-sm text-muted-foreground truncate">{payment.userEmail}</div>
                  </div>
                  <Badge className={getTierBadgeColor(payment.tier)} variant="outline">
                    {payment.tier}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-muted-foreground">
                    Updated {formatDate(payment.updatedAt)}
                  </span>
                  <Button
                    size="sm"
                    className="min-h-[44px]"
                    onClick={(e) => {
                      e.stopPropagation()
                      onApprove(payment)
                    }}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ExpiringSubscriptionsTable({
  subscriptions,
  isLoading,
  onRowClick,
}: {
  subscriptions: ExpiringSubscription[]
  isLoading?: boolean
  onRowClick: (userId: string) => void
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expiring Soon</CardTitle>
          <CardDescription>Subscriptions expiring within 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Expiring Soon
        </CardTitle>
        <CardDescription>
          {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""} expiring within 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {subscriptions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No subscriptions expiring soon
          </p>
        ) : (
          <div className="space-y-3">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex flex-col gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onRowClick(sub.userId)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{sub.userName}</div>
                    <div className="text-sm text-muted-foreground truncate">{sub.userEmail}</div>
                  </div>
                  <Badge
                    variant={sub.daysUntilExpiry <= 7 ? "destructive" : "secondary"}
                    className="shrink-0"
                  >
                    {sub.daysUntilExpiry}d
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className={getTierBadgeColor(sub.tier)} variant="outline">
                    {sub.tier}
                  </Badge>
                  <span className="text-muted-foreground">expires {formatDate(sub.endDate)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function SubscriptionManagementContent() {
  const router = useRouter()
  const {
    stats,
    pendingPayments,
    expiringSubscriptions,
    isLoading,
    error,
    refetch,
    approvePayment,
  } = useAdminSubscriptions()

  const [approveDialog, setApproveDialog] = useState<PendingPayment | null>(null)
  const [approveNotes, setApproveNotes] = useState("")
  const [isApproving, setIsApproving] = useState(false)

  const handleApprove = async () => {
    if (!approveDialog) return
    setIsApproving(true)
    const success = await approvePayment(approveDialog.userId, approveNotes)
    setIsApproving(false)
    if (success) {
      setApproveDialog(null)
      setApproveNotes("")
    }
  }

  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Subscription Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage user subscriptions and payments
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
          className="min-h-[44px] w-full sm:w-auto"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tier Breakdown Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Subscription Tiers</h3>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <TierCard
            tier="FREE"
            count={stats?.byTier.FREE || 0}
            total={stats?.total || 0}
            icon={Users}
            color="text-gray-500"
            isLoading={isLoading}
          />
          <TierCard
            tier="LITE"
            count={stats?.byTier.LITE || 0}
            total={stats?.total || 0}
            icon={Users}
            color="text-blue-500"
            isLoading={isLoading}
          />
          <TierCard
            tier="PRO"
            count={stats?.byTier.PRO || 0}
            total={stats?.total || 0}
            icon={Users}
            color="text-purple-500"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Status Breakdown Cards */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Subscription Status</h3>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <StatusCard
            status="Active"
            count={stats?.byStatus.ACTIVE || 0}
            icon={CheckCircle}
            color="text-green-500"
            isLoading={isLoading}
          />
          <StatusCard
            status="Pending Payment"
            count={stats?.byStatus.PENDING_PAYMENT || 0}
            icon={CreditCard}
            color="text-yellow-500"
            isLoading={isLoading}
          />
          <StatusCard
            status="Expired"
            count={stats?.byStatus.EXPIRED || 0}
            icon={AlertTriangle}
            color="text-orange-500"
            isLoading={isLoading}
          />
          <StatusCard
            status="Cancelled"
            count={stats?.byStatus.CANCELLED || 0}
            icon={XCircle}
            color="text-red-500"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Tables Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PendingPaymentsTable
          payments={pendingPayments}
          isLoading={isLoading}
          onApprove={setApproveDialog}
          onRowClick={handleRowClick}
        />
        <ExpiringSubscriptionsTable
          subscriptions={expiringSubscriptions}
          isLoading={isLoading}
          onRowClick={handleRowClick}
        />
      </div>

      {/* Approve Payment Dialog */}
      <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Payment</DialogTitle>
            <DialogDescription>
              Approve payment for {approveDialog?.userName} ({approveDialog?.userEmail})
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm mb-2">
              Tier: <Badge className={getTierBadgeColor(approveDialog?.tier || "")} variant="outline">
                {approveDialog?.tier}
              </Badge>
            </p>
            <Textarea
              placeholder="Add notes (optional)"
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              className="mt-4"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
