"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface OTPInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  className,
  autoFocus = true,
}: OTPInputProps) {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([])

  // Split value into individual digits
  const digits = React.useMemo(() => {
    const arr = value.split("").slice(0, length)
    while (arr.length < length) arr.push("")
    return arr
  }, [value, length])

  const focusInput = (index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus()
    }
  }

  const handleChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, "").slice(-1)
    
    const newDigits = [...digits]
    newDigits[index] = digit
    const newValue = newDigits.join("")
    onChange(newValue)

    // Auto-focus next input if digit entered
    if (digit && index < length - 1) {
      focusInput(index + 1)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // If current input is empty, move to previous and clear it
        focusInput(index - 1)
        const newDigits = [...digits]
        newDigits[index - 1] = ""
        onChange(newDigits.join(""))
      } else {
        // Clear current input
        const newDigits = [...digits]
        newDigits[index] = ""
        onChange(newDigits.join(""))
      }
      e.preventDefault()
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1)
      e.preventDefault()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1)
      e.preventDefault()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length)
    if (pastedData) {
      onChange(pastedData)
      // Focus the input after the last pasted digit
      const focusIndex = Math.min(pastedData.length, length - 1)
      focusInput(focusIndex)
    }
  }

  const handleFocus = (index: number) => {
    inputRefs.current[index]?.select()
  }

  // Auto-focus first input on mount
  React.useEffect(() => {
    if (autoFocus && !disabled) {
      focusInput(0)
    }
  }, [autoFocus, disabled])

  return (
    <div className={cn("flex gap-1.5 sm:gap-2 justify-center", className)}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            "h-10 w-10 sm:h-12 sm:w-12 rounded-lg border border-input bg-background text-center text-lg sm:text-xl font-semibold",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none",
            "transition-all duration-150",
            "disabled:cursor-not-allowed disabled:opacity-50",
            digit && "border-primary/50"
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  )
}
