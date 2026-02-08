"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown, Loader2, GitBranch, Check } from "lucide-react"
import type { PipelineStage } from "../../types/unified-inbox"

interface PipelineSectionProps {
  currentStage: PipelineStage | null
  availableStages: PipelineStage[]
  onStageChange: (stageId: string) => Promise<boolean>
  loading?: boolean
}

export function PipelineSection({
  currentStage,
  availableStages,
  onStageChange,
  loading = false,
}: PipelineSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)

  const handleStageChange = async (stageId: string) => {
    if (stageId === currentStage?.id) {
      setIsOpen(false)
      return
    }
    
    setPendingStageId(stageId)
    const success = await onStageChange(stageId)
    if (success) {
      setIsOpen(false)
    }
    setPendingStageId(null)
  }

  return (
    <div className="p-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          Pipeline Stage
        </h4>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-9"
            disabled={loading || availableStages.length === 0}
          >
            <div className="flex items-center gap-2">
              {currentStage ? (
                <>
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: currentStage.color }}
                  />
                  <span className="truncate">{currentStage.name}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No stage selected</span>
              )}
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Select stage
          </div>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {availableStages.map((stage) => {
              const isSelected = stage.id === currentStage?.id
              const isPending = stage.id === pendingStageId
              
              return (
                <button
                  key={stage.id}
                  onClick={() => handleStageChange(stage.id)}
                  disabled={isPending}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm disabled:opacity-50 ${
                    isSelected ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="truncate flex-1">{stage.name}</span>
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                  ) : isSelected ? (
                    <Check className="h-3 w-3 shrink-0" />
                  ) : null}
                </button>
              )
            })}
            {availableStages.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1">
                No stages available
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
