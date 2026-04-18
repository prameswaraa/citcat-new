"use client"

import { useState, useMemo } from "react"
import { IconMessage, IconPlus, IconSearch } from "@tabler/icons-react"
import {
  useQuickReplies,
  useQuickReplyCategories,
  useCreateQuickReply,
  useUpdateQuickReply,
  useDeleteQuickReply,
  useCreateQuickReplyCategory,
  useUpdateQuickReplyCategory,
  useDeleteQuickReplyCategory,
  type QuickReply,
  type QuickReplyCategory,
  type CreateQuickReplyInput,
  type UpdateQuickReplyInput,
  type CreateQuickReplyCategoryInput,
  type UpdateQuickReplyCategoryInput,
} from "@/hooks/use-quick-replies"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

import { CategoryDialog } from "../components/category-dialog"
import { EmptyState } from "../components/empty-state"
import { QuickReplyDialog } from "../components/quick-reply-dialog"
import { QuickReplyList } from "../components/quick-reply-list"

export default function QuickRepliesPage() {
  const { toast } = useToast()

  // Data fetching
  const {
    data: quickReplies,
    isLoading: isLoadingReplies,
    isError: isErrorReplies,
  } = useQuickReplies()
  const {
    data: categories,
    isLoading: isLoadingCategories,
    isError: isErrorCategories,
  } = useQuickReplyCategories()

  // Mutations
  const createReply = useCreateQuickReply()
  const updateReply = useUpdateQuickReply()
  const deleteReply = useDeleteQuickReply()
  const createCategory = useCreateQuickReplyCategory()
  const updateCategory = useUpdateQuickReplyCategory()
  const deleteCategory = useDeleteQuickReplyCategory()

  // UI State
  const [searchQuery, setSearchQuery] = useState("")
  const [replyDialogOpen, setReplyDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [editingReply, setEditingReply] = useState<QuickReply | undefined>()
  const [editingCategory, setEditingCategory] = useState<
    QuickReplyCategory | undefined
  >()

  // Filter quick replies by search
  const filteredReplies = useMemo(() => {
    if (!quickReplies) return []
    if (!searchQuery.trim()) return quickReplies

    const query = searchQuery.toLowerCase()
    return quickReplies.filter(
      (reply) =>
        reply.shortcut.toLowerCase().includes(query) ||
        reply.title.toLowerCase().includes(query) ||
        reply.content.toLowerCase().includes(query)
    )
  }, [quickReplies, searchQuery])

  const isLoading = isLoadingReplies || isLoadingCategories
  const isError = isErrorReplies || isErrorCategories
  const hasData = quickReplies && quickReplies.length > 0

  // Handlers
  const handleCreateReply = () => {
    setEditingReply(undefined)
    setReplyDialogOpen(true)
  }

  const handleEditReply = (reply: QuickReply) => {
    setEditingReply(reply)
    setReplyDialogOpen(true)
  }

  const handleReplySubmit = async (
    data: CreateQuickReplyInput | UpdateQuickReplyInput
  ) => {
    try {
      if (editingReply) {
        await updateReply.mutateAsync({
          id: editingReply.id,
          data: data as UpdateQuickReplyInput,
        })
        toast({ title: "Quick reply updated" })
      } else {
        await createReply.mutateAsync(data as CreateQuickReplyInput)
        toast({ title: "Quick reply created" })
      }
      setReplyDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDeleteReply = async (reply: QuickReply) => {
    try {
      await deleteReply.mutateAsync(reply.id)
      toast({ title: "Quick reply deleted" })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      })
    }
  }

  const handleCreateCategory = () => {
    setEditingCategory(undefined)
    setCategoryDialogOpen(true)
  }

  const handleEditCategory = (category: QuickReplyCategory) => {
    setEditingCategory(category)
    setCategoryDialogOpen(true)
  }

  const handleCategorySubmit = async (
    data: CreateQuickReplyCategoryInput | UpdateQuickReplyCategoryInput
  ) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: data as UpdateQuickReplyCategoryInput,
        })
        toast({ title: "Category updated" })
      } else {
        await createCategory.mutateAsync(data as CreateQuickReplyCategoryInput)
        toast({ title: "Category created" })
      }
      setCategoryDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCategory = async (category: QuickReplyCategory) => {
    try {
      await deleteCategory.mutateAsync(category.id)
      toast({ title: "Category deleted" })
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Quick Replies
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create shortcuts for frequently used messages. Type{" "}
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">
              /shortcut
            </code>{" "}
            in the message input to quickly insert a reply.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateCategory}>
            Add Category
          </Button>
          <Button size="sm" onClick={handleCreateReply}>
            <IconPlus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-4">
        {/* Error State */}
          {isError && (
            <div className="border-destructive/50 bg-destructive/10 rounded-lg border p-4 text-center">
              <p className="text-destructive text-sm">
                Failed to load quick replies. Please try again.
              </p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !isError && (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-sm" />
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !isError && !hasData && (
            <EmptyState
              icon={<IconMessage className="text-muted-foreground h-8 w-8" />}
              title="No quick replies yet"
              description="Create your first quick reply to speed up customer conversations. Quick replies help you respond faster with pre-written messages."
              action={
                <Button onClick={handleCreateReply}>
                  <IconPlus className="mr-1 h-4 w-4" />
                  Create Quick Reply
                </Button>
              }
            />
          )}

          {/* Content */}
          {!isLoading && !isError && hasData && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <IconSearch className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search quick replies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* List */}
              {filteredReplies.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    No quick replies match your search
                  </p>
                </div>
              ) : (
                <QuickReplyList
                  quickReplies={filteredReplies}
                  categories={categories || []}
                  onEdit={handleEditReply}
                  onDelete={handleDeleteReply}
                  onEditCategory={handleEditCategory}
                  onDeleteCategory={handleDeleteCategory}
                />
              )}
            </div>
          )}
      </div>

      {/* Quick Reply Dialog */}
      <QuickReplyDialog
        open={replyDialogOpen}
        onOpenChange={setReplyDialogOpen}
        quickReply={editingReply}
        categories={categories || []}
        onSubmit={handleReplySubmit}
        isLoading={createReply.isPending || updateReply.isPending}
      />

      {/* Category Dialog */}
      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSubmit={handleCategorySubmit}
        isLoading={createCategory.isPending || updateCategory.isPending}
      />
    </div>
  )
}
