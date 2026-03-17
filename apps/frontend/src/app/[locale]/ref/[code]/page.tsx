/**
 * Referral Link Handler
 *
 * Validates referral code and redirects to registration page with ref param.
 * Sets a signed referral token cookie for secure Google OAuth tracking.
 */

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3005"

interface Props {
  params: Promise<{ locale: string; code: string }>
}

interface ValidateResponse {
  valid: boolean
  affiliateName?: string
  signedToken?: string
}

async function validateReferralCode(code: string): Promise<ValidateResponse> {
  try {
    const response = await fetch(
      `${API_URL}/api/v1/affiliate/validate/${code}`,
      {
        method: "GET",
        cache: "no-store",
      }
    )

    const result = await response.json()

    if (!result.success) {
      return { valid: false }
    }

    return {
      valid: result.data.valid,
      affiliateName: result.data.affiliateName,
      signedToken: result.data.signedToken,
    }
  } catch {
    return { valid: false }
  }
}

export default async function ReferralPage({ params }: Props) {
  const { locale, code } = await params

  // Validate the referral code and get signed token
  const validation = await validateReferralCode(code)

  // Set signed referral token cookie for Google OAuth tracking
  if (validation.valid && validation.signedToken) {
    const cookieStore = await cookies()
    cookieStore.set("referral_token", validation.signedToken, {
      httpOnly: true, // Prevent client-side JS access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours (matches token expiry)
      path: "/",
    })
  }

  // Redirect to register page with ref param
  redirect(`/${locale}/register?ref=${code.toUpperCase()}`)
}

export async function generateMetadata({ params }: Props) {
  const { code } = await params

  return {
    title: "Join via Referral - KirimChat",
    description: `You've been invited to join KirimChat with referral code ${code}`,
  }
}
