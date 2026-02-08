import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    // Get the callback URL from backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
    const url = new URL(request.url)

    // Construct backend callback URL with all query parameters
    const backendCallbackUrl = `${backendUrl}/api/auth/callback/google${url.search}`

    // Direct redirect to backend - backend will set cookies and redirect back to frontend
    return NextResponse.redirect(backendCallbackUrl)
}
