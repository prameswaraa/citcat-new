"use client"

import { RefreshCw } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import type { DurationConfig } from "../../hooks/use-admin-subscription-plans"

interface DurationConfigEditorProps {
  durations: DurationConfig[]
  onChange: (durations: DurationConfig[]) => void
  basePrice: number
  onSave?: (durations: DurationConfig[]) => Promise<{ success: boolean; message: string }>
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
}

// Default durations if none provided
const DEFAULT_DURATIONS: DurationConfig[] = [
  { months: 1, days: 30, discountPercent: 0, enabled: true, label: "1 Bulan" },
  { months: 3, days: 90, discountPercent: 10, enabled: true, label: "3 Bulan" },
  { months: 6, days: 180, discountPercent: 15, enabled: true, label: "6 Bulan" },
  { months: 12, days: 365, discountPercent: 20, enabled: true, label: "1 Tahun" },
]

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export function DurationConfigEditor({
  durations,
  onChange,
  basePrice,
  onSave,
  isSaving,
  setIsSaving,
}: DurationConfigEditorProps) {
  const t = useTranslations("admin")
  const tCommon = useTranslations("common")
  const { toast } = useToast()

  // Use provided durations or defaults
  const currentDurations = durations.length > 0 ? durations : DEFAULT_DURATIONS

  const handleDiscountChange = (months: number, value: string) => {
    const discountPercent = Math.min(100, Math.max(0, parseInt(value, 10) || 0))
    const updated = currentDurations.map((d) =>
      d.months === months ? { ...d, discountPercent } : d
    )
    onChange(updated)
  }

  const handleEnabledChange = (months: number, enabled: boolean) => {
    const updated = currentDurations.map((d) =>
      d.months === months ? { ...d, enabled } : d
    )
    onChange(updated)
  }

  const calculatePrice = (months: number, discountPercent: number) => {
    const fullPrice = basePrice * months
    const discountMultiplier = 1 - discountPercent / 100
    return Math.round(fullPrice * discountMultiplier)
  }

  const handleSaveDurations = async () => {
    if (!onSave) return

    setIsSaving(true)
    try {
      const result = await onSave(currentDurations)
      if (result.success) {
        toast({
          title: tCommon("success"),
          description: result.message,
        })
      } else {
        toast({
          title: tCommon("failed"),
          description: result.message,
          variant: "destructive",
        })
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-2">
        {t("durationConfigDesc")}
      </div>
      
      <div className="space-y-3">
        {currentDurations.map((duration) => {
          const totalPrice = calculatePrice(duration.months, duration.discountPercent)
          const savings = basePrice * duration.months - totalPrice

          return (
            <div
              key={duration.months}
              className={`p-3 border rounded-lg ${
                duration.enabled ? "bg-background" : "bg-muted/50 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={duration.enabled}
                    onCheckedChange={(checked) =>
                      handleEnabledChange(duration.months, checked)
                    }
                  />
                  <span className="font-medium">{duration.label}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {duration.days} {t("days")}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("discountPercent")}</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={duration.discountPercent}
                      onChange={(e) =>
                        handleDiscountChange(duration.months, e.target.value)
                      }
                      className="h-8 w-20"
                      disabled={!duration.enabled}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">{t("totalPrice")}</Label>
                  <div className="text-sm font-medium">
                    {formatPrice(totalPrice)}
                  </div>
                  {savings > 0 && duration.enabled && (
                    <div className="text-xs text-green-600">
                      {t("savingsAmount", { amount: formatPrice(savings) })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {onSave && (
        <Button
          onClick={handleSaveDurations}
          disabled={isSaving}
          className="w-full"
          variant="secondary"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              {tCommon("saving")}
            </>
          ) : (
            t("saveDurations")
          )}
        </Button>
      )}
    </div>
  )
}
