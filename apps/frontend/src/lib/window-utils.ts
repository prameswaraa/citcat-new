export interface WindowStatus {
    isActive: boolean
    lastInboundMessageAt: string | null
    windowExpiresAt: string | null
    remainingTime: {
        hours: number
        minutes: number
        seconds: number
        totalSeconds: number
    } | null
    remainingTimeFormatted: string
    status: 'active' | 'expired' | 'never_messaged'
}

export async function fetchWindowStatus(customerId: string): Promise<WindowStatus | null> {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'
        const response = await fetch(`${apiUrl}/api/v1/customers/${customerId}/window-status`, {
            credentials: 'include'
        })

        if (!response.ok) {
            console.error('Failed to fetch window status:', response.status)
            return null
        }

        const result = await response.json()
        return result.data
    } catch (error) {
        console.error('Error fetching window status:', error)
        return null
    }
}

export function formatRemainingTime(remainingTime: WindowStatus['remainingTime']): string {
    if (!remainingTime) return 'Expired'

    const { hours, minutes, seconds } = remainingTime

    if (hours > 0) {
        return `${hours}h ${minutes}m`
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`
    } else {
        return `${seconds}s`
    }
}

export function getWindowStatusColor(status: WindowStatus['status']): string {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-700 border-green-200'
        case 'expired':
            return 'bg-yellow-100 text-yellow-700 border-yellow-200'
        case 'never_messaged':
            return 'bg-gray-100 text-gray-700 border-gray-200'
        default:
            return 'bg-gray-100 text-gray-500 border-gray-200'
    }
}

export function shouldShowWarning(remainingTime: WindowStatus['remainingTime']): boolean {
    if (!remainingTime) return false
    return remainingTime.totalSeconds < 3600 // Less than 1 hour
}

export function shouldShowUrgent(remainingTime: WindowStatus['remainingTime']): boolean {
    if (!remainingTime) return false
    return remainingTime.totalSeconds < 300 // Less than 5 minutes
}
