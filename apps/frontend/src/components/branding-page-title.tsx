"use client"

import { useEffect } from "react"
import { useBranding } from "@/hooks/use-branding"

interface BrandingPageTitleProps {
  suffix?: string
}

/**
 * Component to dynamically update page title with branding
 * Requirements: 3.1, 3.2 - Display configured website name in page title
 */
export function BrandingPageTitle({ suffix }: BrandingPageTitleProps) {
  const { websiteName } = useBranding()

  useEffect(() => {
    const title = suffix ? `${suffix} | ${websiteName}` : websiteName
    document.title = title
  }, [websiteName, suffix])

  return null
}
