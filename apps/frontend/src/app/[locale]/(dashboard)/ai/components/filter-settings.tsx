import { useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { AIConfig } from "@/lib/api/ai-api"

interface FilterSettingsProps {
  config: AIConfig
  setConfig: (config: AIConfig) => void
  onSave: () => void
  saving: boolean
}

export function FilterSettings({ config, setConfig, onSave, saving }: FilterSettingsProps) {
  const [newFilterWord, setNewFilterWord] = useState("")

  const addFilter = () => {
    if (newFilterWord.trim()) {
      const currentFilters = config.filterWords || [];
      if (!currentFilters.includes(newFilterWord.trim())) {
          setConfig({
            ...config,
            filterWords: [...currentFilters, newFilterWord.trim()]
          });
      }
      setNewFilterWord("");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filter Words</CardTitle>
        <CardDescription>
          Messages containing these words will be ignored by the AI.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-2">
          <Input 
            placeholder="Enter a word or phrase to block (e.g. 'competitor')" 
            value={newFilterWord}
            onChange={(e) => setNewFilterWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addFilter();
              }
            }}
          />
          <Button onClick={addFilter}>
            Add Filter
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {(config.filterWords || []).map((word, index) => (
            <Badge key={index} variant="secondary" className="text-sm py-1 px-3">
              {word}
              <button 
                className="ml-2 hover:text-destructive"
                onClick={() => {
                  const newFilters = (config.filterWords || []).filter(w => w !== word);
                  setConfig({ ...config, filterWords: newFilters });
                }}
              >
                ×
              </button>
            </Badge>
          ))}
          {(!config.filterWords || config.filterWords.length === 0) && (
            <p className="text-sm text-muted-foreground italic">No filters added.</p>
          )}
        </div>

        <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}