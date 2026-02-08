"use client"

import { createContext, useContext, type ReactNode } from "react"
import { useBranding, type UseBrandingReturn } from "@/hooks/use-branding"

/**
 * BrandingContext provides global access to branding settings
 * Requirements: 3.1, 4.1, 5.1
 */
const BrandingContext = createContext<UseBrandingReturn | null>(null)

interface BrandingProviderProps {
  children: ReactNode
}

/**
 * BrandingProvider wraps the app to provide global branding access
 * Uses useBranding hook internally for data fetching and caching
 */
export function BrandingProvider({ children }: BrandingProviderProps) {
  const branding = useBranding()

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  )
}

/**
 * Hook to access branding context
 * Must be used within BrandingProvider
 */
export function useBrandingContext(): UseBrandingReturn {
  const context = useContext(BrandingContext)

  if (!context) {
    throw new Error(
      "useBrandingContext must be used within a BrandingProvider"
    )
  }

  return context
}
