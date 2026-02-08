"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, StickyNote, Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import type { CustomerNote } from "../../types/unified-inbox"

interface NotesSectionProps {
  notes: CustomerNote[]
  onAddNote: (content: string) => Promise<boolean>
  loading?: boolean
  maxDisplay?: number
}

export function NotesSection({
  notes,
  onAddNote,
  loading = false,
  maxDisplay = 5,
}: NotesSectionProps) {
  const [newNote, setNewNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAll, setShowAll] = useState(false)

  // Sort notes by createdAt descending (most recent first)
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  const displayedNotes = showAll ? sortedNotes : sortedNotes.slice(0, maxDisplay)
  const hasMore = sortedNotes.length > maxDisplay

  const handleSubmit = async () => {
    if (!newNote.trim() || isSubmitting) return

    setIsSubmitting(true)
    const success = await onAddNote(newNote.trim())
    if (success) {
      setNewNote("")
    }
    setIsSubmitting(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          Notes
        </h4>
        {notes.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Add note input */}
      <div className="flex gap-2 mb-3">
        <Textarea
          placeholder="Add a note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || isSubmitting}
          className="min-h-[60px] text-sm resize-none"
          rows={2}
        />
        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!newNote.trim() || loading || isSubmitting}
          className="shrink-0 h-[60px] w-10"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-2">
        {displayedNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet</p>
        ) : (
          displayedNotes.map((note) => (
            <div
              key={note.id}
              className="p-2 rounded-md bg-muted/50 text-sm"
            >
              <p className="whitespace-pre-wrap break-words">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Show more button */}
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="w-full mt-2 text-xs"
        >
          Show {sortedNotes.length - maxDisplay} more note{sortedNotes.length - maxDisplay !== 1 ? "s" : ""}
        </Button>
      )}
      {showAll && hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(false)}
          className="w-full mt-2 text-xs"
        >
          Show less
        </Button>
      )}
    </div>
  )
}
