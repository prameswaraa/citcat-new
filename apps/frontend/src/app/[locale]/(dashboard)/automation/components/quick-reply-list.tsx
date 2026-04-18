"use client"

import { useState } from "react"
import { IconChevronDown, IconEdit, IconTrash } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import type { QuickReply, QuickReplyCategory } from "@/hooks/use-quick-replies"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface QuickReplyListProps {
  quickReplies: QuickReply[]
  categories: QuickReplyCategory[]
  onEdit: (quickReply: QuickReply) => void
  onDelete: (quickReply: QuickReply) => void
  onEditCategory: (category: QuickReplyCategory) => void
  onDeleteCategory: (category: QuickReplyCategory) => void
}

interface GroupedReplies {
  [categoryId: string]: {
    category: QuickReplyCategory | null
    replies: QuickReply[]
  }
}

export function QuickReplyList({
  quickReplies,
  categories,
  onEdit,
  onDelete,
  onEditCategory,
  onDeleteCategory,
}: QuickReplyListProps) {
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(["uncategorized", ...categories.map((c) => c.id)])
  )
  const [deleteReply, setDeleteReply] = useState<QuickReply | null>(null)
  const [deleteCategory, setDeleteCategory] =
    useState<QuickReplyCategory | null>(null)

  // Group replies by category
  const grouped: GroupedReplies = {}

  // Initialize with existing categories
  for (const category of categories) {
    grouped[category.id] = { category, replies: [] }
  }
  grouped["uncategorized"] = { category: null, replies: [] }

  // Assign replies to groups
  for (const reply of quickReplies) {
    const categoryId = reply.category?.id || "uncategorized"
    if (!grouped[categoryId]) {
      grouped[categoryId] = {
        category: reply.category,
        replies: [],
      }
    }
    grouped[categoryId].replies.push(reply)
  }

  const toggleCategory = (categoryId: string) => {
    const newOpen = new Set(openCategories)
    if (newOpen.has(categoryId)) {
      newOpen.delete(categoryId)
    } else {
      newOpen.add(categoryId)
    }
    setOpenCategories(newOpen)
  }

  const handleDeleteReply = () => {
    if (deleteReply) {
      onDelete(deleteReply)
      setDeleteReply(null)
    }
  }

  const handleDeleteCategory = () => {
    if (deleteCategory) {
      onDeleteCategory(deleteCategory)
      setDeleteCategory(null)
    }
  }

  // Sort: categories first (by order), then uncategorized
  const sortedCategoryIds = Object.keys(grouped).sort((a, b) => {
    if (a === "uncategorized") return 1
    if (b === "uncategorized") return -1
    const catA = grouped[a].category
    const catB = grouped[b].category
    if (catA && catB) return catA.order - catB.order
    return 0
  })

  return (
    <div className="space-y-2">
      {sortedCategoryIds.map((categoryId) => {
        const group = grouped[categoryId]
        const isUncategorized = categoryId === "uncategorized"
        const isOpen = openCategories.has(categoryId)

        // Skip empty uncategorized
        if (isUncategorized && group.replies.length === 0) return null

        return (
          <Collapsible
            key={categoryId}
            open={isOpen}
            onOpenChange={() => toggleCategory(categoryId)}
          >
            <div className="rounded-lg border">
              <CollapsibleTrigger asChild>
                <button className="hover:bg-muted/50 flex w-full items-center justify-between px-4 py-3 text-left transition-colors">
                  <div className="flex items-center gap-2">
                    <IconChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                    <span className="font-medium">
                      {isUncategorized ? "Uncategorized" : group.category?.name}
                    </span>
                    <Badge variant="secondary" className="ml-1">
                      {group.replies.length}
                    </Badge>
                  </div>
                  {!isUncategorized && group.category && (
                    <div
                      className="flex gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onEditCategory(group.category!)}
                      >
                        <IconEdit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        onClick={() => setDeleteCategory(group.category)}
                      >
                        <IconTrash className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t">
                  {group.replies.length === 0 ? (
                    <p className="text-muted-foreground px-4 py-3 text-sm">
                      No quick replies in this category
                    </p>
                  ) : (
                    <div className="divide-y">
                      {group.replies.map((reply) => (
                        <QuickReplyItem
                          key={reply.id}
                          reply={reply}
                          onEdit={() => onEdit(reply)}
                          onDelete={() => setDeleteReply(reply)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      {/* Delete Reply Confirmation */}
      <AlertDialog
        open={!!deleteReply}
        onOpenChange={() => setDeleteReply(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quick Reply</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteReply?.title}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReply}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog
        open={!!deleteCategory}
        onOpenChange={() => setDeleteCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteCategory?.name}
              &quot;? Quick replies in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface QuickReplyItemProps {
  reply: QuickReply
  onEdit: () => void
  onDelete: () => void
}

function QuickReplyItem({ reply, onEdit, onDelete }: QuickReplyItemProps) {
  // Truncate content for preview
  const contentPreview =
    reply.content.length > 100
      ? reply.content.substring(0, 100) + "..."
      : reply.content

  return (
    <div className="group flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            /{reply.shortcut}
          </Badge>
          <span className="truncate font-medium">{reply.title}</span>
        </div>
        <p className="text-muted-foreground line-clamp-2 text-sm">
          {contentPreview}
        </p>
      </div>
      <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onEdit}
        >
          <IconEdit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive h-8 w-8 p-0"
          onClick={onDelete}
        >
          <IconTrash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
