"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconBrandWhatsapp, IconUsers } from "@tabler/icons-react"
import type { WhatsAppPhoneNumberOption } from "@/hooks/use-whatsapp-phone-numbers"

interface WhatsAppPhoneSelectorProps {
  phoneNumbers: WhatsAppPhoneNumberOption[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  showAllOption?: boolean
  className?: string
}

export function WhatsAppPhoneSelector({
  phoneNumbers,
  selectedId,
  onSelect,
  showAllOption = true,
  className,
}: WhatsAppPhoneSelectorProps) {
  // Don't render if only 1 or 0 phone numbers
  if (phoneNumbers.length <= 1) return null

  const value = selectedId || "all"

  return (
    <Select
      value={value}
      onValueChange={(v) => onSelect(v === "all" ? null : v)}
    >
      <SelectTrigger className={className || "h-9 w-[220px] text-sm"}>
        <SelectValue>
          <div className="flex items-center gap-2">
            {value === "all" ? (
              <>
                <IconUsers className="h-4 w-4" />
                <span>Semua Nomor</span>
              </>
            ) : (
              <>
                <IconBrandWhatsapp className="h-4 w-4 text-green-500" />
                <span className="truncate">
                  {phoneNumbers.find((p) => p.id === value)?.displayPhoneNumber}
                </span>
              </>
            )}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showAllOption && (
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <IconUsers className="h-4 w-4" />
              <span>Semua Nomor</span>
            </div>
          </SelectItem>
        )}
        {phoneNumbers.map((pn) => (
          <SelectItem key={pn.id} value={pn.id}>
            <div className="flex items-center gap-2">
              <IconBrandWhatsapp className="h-4 w-4 text-green-500" />
              <span>{pn.displayPhoneNumber}</span>
              {pn.verifiedName && (
                <span className="text-xs text-muted-foreground">
                  ({pn.verifiedName})
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
