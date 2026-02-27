"use client"

import { useState, useEffect } from "react"
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
import type { AIConfig } from "@/lib/api/ai-api"
import { useToast } from "@/hooks/use-toast"
import { useUpdateAIConfig } from "@/hooks/use-ai"

interface FilterSettingsProps {
  initialConfig: AIConfig
}

export function FilterSettings({ initialConfig }: FilterSettingsProps) {
  const { toast } = useToast()
  const [config, setConfig] = useState<AIConfig>(initialConfig)
  const [newFilterWord, setNewFilterWord] = useState("")
  const updateConfig = useUpdateAIConfig()

  // Sync with initial config when it changes
  useEffect(() => {
    setConfig(initialConfig)
  }, [initialConfig])

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

  const handleSave = () => {
    updateConfig.mutate(
      { data: config },
      {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Filter settings saved successfully",
          })
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to save settings",
          })
        },
      }
    )
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
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
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