const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  key?: string // Only returned on creation
  expiresAt: string
  createdAt: string
  lastUsedAt: string | null
}

export interface CreateApiKeyResponse {
  success: boolean
  data: ApiKey
  message: string
}

export interface ListApiKeysResponse {
  success: boolean
  data: ApiKey[]
}

export const apiKeysApi = {
  async list(): Promise<ApiKey[]> {
    const response = await fetch(`${API_URL}/api/v1/settings/api-keys`, {
      method: 'GET',
      credentials: 'include',
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to fetch API keys')
    }

    return result.data
  },

  async create(name: string, expiresInDays?: number): Promise<ApiKey> {
    const response = await fetch(`${API_URL}/api/v1/settings/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name, expiresInDays }),
    })

    const result = await response.json()

    if (!result.success) {
      const errorMessage = result.error?.details
        ? result.error.details.map((d: any) => d.message).join(', ')
        : result.error?.message || 'Failed to create API key'
      throw new Error(errorMessage)
    }

    return result.data
  },

  async revoke(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/v1/settings/api-keys/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to revoke API key')
    }
  },
}
