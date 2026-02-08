const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

/**
 * Branding Settings
 * Requirements: 1.1, 2.1
 */
export interface BrandingSettings {
  websiteName: string
  logoUrl: string
  supportEmail: string
  supportWhatsapp: string
  termsUrl: string
  privacyUrl: string
}

/**
 * Default branding values (matches backend defaults)
 */
export const DEFAULT_BRANDING: BrandingSettings = {
  websiteName: 'KirimChat',
  logoUrl: '',
  supportEmail: 'support@kirim.chat',
  supportWhatsapp: '+6281295648580',
  termsUrl: 'https://kirim.chat/terms',
  privacyUrl: 'https://kirim.chat/privacy',
}

export const brandingApi = {
  /**
   * Fetch public branding settings (no auth required)
   * Requirements: 7.1, 7.2
   */
  async get(): Promise<BrandingSettings> {
    const response = await fetch(`${API_URL}/api/v1/branding`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Return defaults on error
      return DEFAULT_BRANDING
    }

    const result = await response.json()

    if (!result.success) {
      return DEFAULT_BRANDING
    }

    return result.data
  },
}
