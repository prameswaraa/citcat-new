"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, X, Loader2, Tag } from "lucide-react"

interface TagsSectionProps {
  tags: string[]
  availableTags: string[]
  onAddTag: (tag: string) => Promise<boolean>
  onRemoveTag: (tag: string) => Promise<boolean>
  loading?: boolean
  readOnly?: boolean
}

export function TagsSection({
  tags,
  availableTags,
  onAddTag,
  onRemoveTag,
  loading = false,
}: TagsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingTag, setPendingTag] = useState<string | null>(null)

  // Filter out tags that are already assigned
  const unassignedTags = availableTags.filter((tag) => !tags.includes(tag))

  const handleAddTag = async (tag: string) => {
    setPendingTag(tag)
    const success = await onAddTag(tag)
    if (success) {
      setIsOpen(false)
    }
    setPendingTag(null)
  }

  const handleRemoveTag = async (tag: string) => {
    setPendingTag(tag)
    await onRemoveTag(tag)
    setPendingTag(null)
  }

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Tags
        </h4>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              disabled={loading || unassignedTags.length === 0}
            >
              <Plus className="h-3 w-3" />
              Add Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Select a tag
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {unassignedTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleAddTag(tag)}
                  disabled={pendingTag === tag}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-left text-sm disabled:opacity-50"
                >
                  {pendingTag === tag ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  <span className="truncate">{tag}</span>
                </button>
              ))}
              {unassignedTags.length === 0 && (
                <p className="text-xs text-muted-foreground px-2 py-1">
                  No more tags available
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">No tags assigned</p>
        ) : (
          tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                disabled={loading || pendingTag === tag}
                className="ml-1 hover:bg-muted rounded-full p-0.5 disabled:opacity-50"
              >
                {pendingTag === tag ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  )
}
