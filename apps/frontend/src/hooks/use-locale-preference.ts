"use client"

import { useCallback, useEffect } from "react"
import { useLocale } from "next-intl"
import { useRouter, usePathname } from "@/i18n/routing"
import { locales, defaultLocale, type Locale } from "@/i18n/config"

const LOCALE_STORAGE_KEY = "preferred-locale"

/**
 * Checks if a given string is a valid locale
 */
function isValidLocale(locale: string | null): locale is Locale {
  return locale !== null && locales.includes(locale as Locale)
}

/**
 * Gets the stored locale preference from localStorage
 */
function getStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null
  
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return isValidLocale(stored) ? stored : null
  } catch {
    // localStorage might be unavailable (e.g., private browsing)
    return null
  }
}

/**
 * Stores the locale preference in localStorage
 */
function setStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // localStorage might be unavailable
    console.warn("Unable to store locale preference in localStorage")
  }
}

/**
 * Detects the user's preferred language from browser settings
 * Returns the closest matching supported locale or defaultLocale
 */
function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale
  
  try {
    // Get browser languages (e.g., ["en-US", "en", "id"])
    const browserLanguages = navigator.languages || [navigator.language]
    
    for (const lang of browserLanguages) {
      // Extract the language code (e.g., "en-US" -> "en")
      const langCode = lang.split("-")[0].toLowerCase()
      
      if (isValidLocale(langCode)) {
        return langCode
      }
    }
  } catch {
    // navigator might not be available
  }
  
  return defaultLocale
}

/**
 * Hook for managing locale preference persistence
 * 
 * Features:
 * - Stores selected locale in localStorage (Requirement 2.1)
 * - Automatically applies stored preference on return visits (Requirement 2.2)
 * - Falls back to English if stored preference is unavailable (Requirement 2.3)
 * - Detects browser language when no preference is stored (Requirement 2.4)
 */
export function useLocalePreference() {
  const currentLocale = useLocale() as Locale
  const router = useRouter()
  const pathname = usePathname()

  /**
   * Sets the locale and persists it to localStorage
   * This is the only way to trigger a locale change (explicit user action)
   */
  const setLocale = useCallback((newLocale: Locale) => {
    setStoredLocale(newLocale)
    router.replace(pathname, { locale: newLocale })
  }, [router, pathname])

  /**
   * Clears the stored locale preference
   */
  const clearLocalePreference = useCallback(() => {
    if (typeof window === "undefined") return
    
    try {
      localStorage.removeItem(LOCALE_STORAGE_KEY)
    } catch {
      // localStorage might be unavailable
    }
  }, [])

  /**
   * Sync localStorage with current URL locale
   * This respects the URL the user explicitly visited instead of auto-redirecting
   */
  useEffect(() => {
    const storedLocale = getStoredLocale()
    
    if (!storedLocale) {
      // No stored preference - detect browser language for initial preference only
      const detectedLocale = detectBrowserLocale()
      setStoredLocale(detectedLocale)
    } else if (storedLocale !== currentLocale) {
      // URL locale differs from stored preference - sync localStorage with URL
      // This ensures localStorage reflects the current locale without redirecting
      setStoredLocale(currentLocale)
    }
  }, [currentLocale])

  return {
    locale: currentLocale,
    setLocale,
    clearLocalePreference,
    storedLocale: getStoredLocale(),
    detectedBrowserLocale: detectBrowserLocale(),
  }
}

/**
 * Gets the initial locale for server-side rendering
 * Useful for determining locale before hydration
 */
export function getInitialLocale(): Locale {
  const stored = getStoredLocale()
  if (stored) return stored
  
  return detectBrowserLocale()
}
