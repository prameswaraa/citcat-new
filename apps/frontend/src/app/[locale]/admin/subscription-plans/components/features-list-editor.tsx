"use client"

import { useState } from "react"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface FeaturesListEditorProps {
  features: string[]
  onChange: (features: string[]) => void
  maxLength?: number
}

export function FeaturesListEditor({
  features,
  onChange,
  maxLength = 100,
}: FeaturesListEditorProps) {
  const t = useTranslations("admin")
  const [newFeature, setNewFeature] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = newFeature.trim()
    if (!trimmed) return

    if (trimmed.length > maxLength) {
      setError(t("maxCharacters", { max: maxLength }))
      return
    }

    onChange([...features, trimmed])
    setNewFeature("")
    setError(null)
  }

  const handleRemove = (index: number) => {
    const updated = features.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...features]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === features.length - 1) return
    const updated = [...features]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    onChange(updated)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3">
      {/* Features List */}
      {features.length > 0 ? (
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 border rounded-md bg-muted/30"
            >
              <span className="flex-1 text-sm truncate" title={feature}>
                {feature}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title={t("moveUp")}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === features.length - 1}
                  title={t("moveDown")}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleRemove(index)}
                  title={t("deleteFeature")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic py-2">
          {t("noFeaturesYet")}
        </p>
      )}

      {/* Add New Feature */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={newFeature}
            onChange={(e) => {
              setNewFeature(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={t("addNewFeature")}
            maxLength={maxLength}
          />
          {error && <p className="text-sm text-destructive mt-1">{error}</p>}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          disabled={!newFeature.trim()}
          title={t("addFeature")}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("featuresCount", { count: features.length, max: maxLength })}
      </p>
    </div>
  )
}
