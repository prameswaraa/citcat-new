"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
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
import {
  IconPlayerPlay,
  IconClock,
  IconX,
  IconRefresh,
  IconAlertCircle,
  IconTemplate,
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"
import { id, enUS } from "date-fns/locale"
import { useLocale } from "next-intl"

interface BroadcastJob {
  id: string
  templateName: string
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED"
  totalRecipients: number
  successCount: number
  failedCount: number
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

interface ActiveJobsProps {
  onJobClick?: (jobId: string) => void
}

export function ActiveJobs({ onJobClick }: ActiveJobsProps) {
  const t = useTranslations("broadcast")
  const locale = useLocale()
  const [jobs, setJobs] = useState<BroadcastJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null)
  const [jobToCancel, setJobToCancel] = useState<BroadcastJob | null>(null)

  const dateLocale = locale === "id" ? id : enUS


  const loadJobs = useCallback(async () => {
    try {
      setError(null)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
      const response = await fetch(
        `${apiUrl}/api/v1/broadcast/jobs?status=PENDING&status=PROCESSING`,
        { credentials: "include" }
      )

      if (response.ok) {
        const result = await response.json()
        // Filter only PENDING and PROCESSING jobs
        const activeJobs = (result.data || []).filter(
          (job: BroadcastJob) => job.status === "PENDING" || job.status === "PROCESSING"
        )
        setJobs(activeJobs)
      } else {
        setError("Failed to load jobs")
      }
    } catch (err) {
      console.error("Error loading jobs:", err)
      setError("Failed to load jobs")
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load and polling for real-time updates
  useEffect(() => {
    loadJobs()
    
    // Poll every 3 seconds for real-time progress
    const interval = setInterval(loadJobs, 3000)
    
    return () => clearInterval(interval)
  }, [loadJobs])

  const handleCancelJob = async (job: BroadcastJob) => {
    setJobToCancel(job)
  }

  const confirmCancelJob = async () => {
    if (!jobToCancel) return

    try {
      setCancellingJobId(jobToCancel.id)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"
      const response = await fetch(
        `${apiUrl}/api/v1/broadcast/jobs/${jobToCancel.id}/cancel`,
        {
          method: "POST",
          credentials: "include",
        }
      )

      if (response.ok) {
        // Refresh jobs list
        await loadJobs()
      } else {
        const result = await response.json()
        setError(result.error?.message || "Failed to cancel job")
      }
    } catch (err) {
      console.error("Error cancelling job:", err)
      setError("Failed to cancel job")
    } finally {
      setCancellingJobId(null)
      setJobToCancel(null)
    }
  }

  const getProgressPercentage = (job: BroadcastJob) => {
    if (job.totalRecipients === 0) return 0
    const processed = job.successCount + job.failedCount
    return Math.round((processed / job.totalRecipients) * 100)
  }

  const getStatusBadge = (status: BroadcastJob["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="gap-1">
            <IconClock className="h-3 w-3" />
            {t("status.pending")}
          </Badge>
        )
      case "PROCESSING":
        return (
          <Badge variant="default" className="gap-1 bg-blue-500">
            <IconPlayerPlay className="h-3 w-3" />
            {t("status.processing")}
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }


  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <IconAlertCircle className="mb-2 h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4 gap-2"
          onClick={() => {
            setLoading(true)
            loadJobs()
          }}
        >
          <IconRefresh className="h-4 w-4" />
          {t("customerSelector.retry")}
        </Button>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <IconPlayerPlay className="mb-4 h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{t("activeJobs.noJobs")}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {jobs.map((job) => {
          const progress = getProgressPercentage(job)
          const processed = job.successCount + job.failedCount

          return (
            <Card
              key={job.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => onJobClick?.(job.id)}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconTemplate className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{job.templateName}</span>
                    </div>
                    {getStatusBadge(job.status)}
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {t("jobCard.progress")}: {progress}%
                      </span>
                      <span>
                        {processed} / {job.totalRecipients}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex gap-4">
                      <span className="text-muted-foreground">
                        {t("jobCard.recipients")}: {job.totalRecipients}
                      </span>
                      {job.successCount > 0 && (
                        <span className="text-green-600">
                          {t("jobCard.success")}: {job.successCount}
                        </span>
                      )}
                      {job.failedCount > 0 && (
                        <span className="text-destructive">
                          {t("jobCard.failed")}: {job.failedCount}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.createdAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-1"
                      disabled={cancellingJobId === job.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancelJob(job)
                      }}
                    >
                      <IconX className="h-4 w-4" />
                      {cancellingJobId === job.id
                        ? "..."
                        : t("jobCard.cancelJob")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!jobToCancel} onOpenChange={() => setJobToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("jobCard.cancelJob")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {jobToCancel?.templateName}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("form.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelJob}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("jobCard.cancelJob")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ActiveJobs
