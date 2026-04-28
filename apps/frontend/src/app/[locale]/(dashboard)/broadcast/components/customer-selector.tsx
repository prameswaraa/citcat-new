"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  IconSearch,
  IconUsers,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconFilter,
  IconRefresh,
} from "@tabler/icons-react"

interface BroadcastCustomer {
  id: string
  phoneNumber: string
  name: string | null
  tags: string[]
  pipelineStage: {
    id: string
    name: string
    color: string
  } | null
}

interface PipelineStage {
  id: string
  name: string
  color: string
}

interface CustomerSelectorProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  whatsappPhoneNumberId?: string | null
}

export function CustomerSelector({ selectedIds, onSelectionChange, whatsappPhoneNumberId }: CustomerSelectorProps) {
  const t = useTranslations("broadcast.customerSelector")
  const tRecipient = useTranslations("broadcast.recipientSelector")

  const [customers, setCustomers] = useState<BroadcastCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [selectedTag, setSelectedTag] = useState<string>("")
  const [selectedStageId, setSelectedStageId] = useState<string>("")

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50

  // Available filter options
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableStages, setAvailableStages] = useState<PipelineStage[]>([])

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.citcat.id"
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", limit.toString())
      if (search) params.set("search", search)
      if (selectedTag) params.set("tags", selectedTag)
      if (selectedStageId) params.set("pipelineStageId", selectedStageId)
      if (whatsappPhoneNumberId) params.set("whatsappPhoneNumberId", whatsappPhoneNumberId)

      const response = await fetch(
        `${apiUrl}/api/v1/customers/broadcast-eligible?${params.toString()}`,
        { credentials: "include" }
      )

      if (response.ok) {
        const result = await response.json()
        setCustomers(result.data || [])
        setTotal(result.pagination?.total || 0)
        setTotalPages(result.pagination?.totalPages || 1)

        // Extract unique tags from customers
        const tags = new Set<string>()
        result.data?.forEach((c: BroadcastCustomer) => {
          c.tags?.forEach((tag) => tags.add(tag))
        })
        setAvailableTags(Array.from(tags).sort())

        // Extract unique pipeline stages
        const stages = new Map<string, PipelineStage>()
        result.data?.forEach((c: BroadcastCustomer) => {
          if (c.pipelineStage) {
            stages.set(c.pipelineStage.id, c.pipelineStage)
          }
        })
        setAvailableStages(Array.from(stages.values()))
      } else {
        setError(t("loadError"))
      }
    } catch (err) {
      console.error("Error loading customers:", err)
      setError(t("loadError"))
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedTag, selectedStageId, whatsappPhoneNumberId, t])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, selectedTag, selectedStageId, whatsappPhoneNumberId])

  const handleSelectAll = () => {
    const allIds = customers.map((c) => c.id)
    const newSelection = new Set(selectedIds)
    allIds.forEach((id) => newSelection.add(id))
    onSelectionChange(Array.from(newSelection))
  }

  const handleDeselectAll = () => {
    const customerIds = new Set(customers.map((c) => c.id))
    const newSelection = selectedIds.filter((id) => !customerIds.has(id))
    onSelectionChange(newSelection)
  }

  const handleToggle = (customerId: string) => {
    if (selectedIds.includes(customerId)) {
      onSelectionChange(selectedIds.filter((id) => id !== customerId))
    } else {
      onSelectionChange([...selectedIds, customerId])
    }
  }

  const clearFilters = () => {
    setSearch("")
    setSelectedTag("")
    setSelectedStageId("")
  }

  const hasFilters = search || selectedTag || selectedStageId

  const allCurrentSelected = customers.length > 0 && customers.every((c) => selectedIds.includes(c.id))
  const someCurrentSelected = customers.some((c) => selectedIds.includes(c.id))

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <IconAlertCircle className="text-destructive mb-2 h-8 w-8" />
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={loadCustomers}>
          <IconRefresh className="mr-2 h-4 w-4" />
          {t("retry")}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {availableTags.length > 0 && (
          <Select 
            value={selectedTag || "__all__"} 
            onValueChange={(v) => setSelectedTag(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("filterByTag")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("allTags")}</SelectItem>
              {availableTags.map((tag) => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {availableStages.length > 0 && (
          <Select 
            value={selectedStageId || "__all__"} 
            onValueChange={(v) => setSelectedStageId(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t("filterByStage")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t("allStages")}</SelectItem>
              {availableStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <IconX className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Selection controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={loading || customers.length === 0}
          >
            <IconCheck className="mr-1 h-4 w-4" />
            {t("selectAll")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeselectAll}
            disabled={loading || !someCurrentSelected}
          >
            <IconX className="mr-1 h-4 w-4" />
            {t("deselectAll")}
          </Button>
        </div>
        <div className="text-muted-foreground text-sm">
          {tRecipient("selectedCount", { count: selectedIds.length })}
        </div>
      </div>

      {/* Customer list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <IconUsers className="text-muted-foreground mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-sm">{tRecipient("noCustomers")}</p>
        </div>
      ) : (
        <ScrollArea className="h-[300px] rounded-md border">
          <div className="p-2">
            {customers.map((customer) => (
              <div
                key={customer.id}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-md p-2"
                onClick={() => handleToggle(customer.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(customer.id)}
                  onCheckedChange={() => handleToggle(customer.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {customer.name || customer.phoneNumber}
                    </span>
                    {customer.pipelineStage && (
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{
                          borderColor: customer.pipelineStage.color,
                          color: customer.pipelineStage.color,
                        }}
                      >
                        {customer.pipelineStage.name}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>{customer.phoneNumber}</span>
                    {customer.tags?.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">
                          {customer.tags.slice(0, 3).join(", ")}
                          {customer.tags.length > 3 && ` +${customer.tags.length - 3}`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {t("showing", { current: customers.length, total })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerSelector
