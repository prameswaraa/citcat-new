/**
 * Assignment API Functions
 * 
 * API functions for conversation assignment management in OneInbox.
 * Handles assigning/unassigning conversations to team members and AI Agents.
 * 
 * Requirements: 1.1, 1.4, 2.2, 3.1
 */

import type { 
  AssignableUser, 
  AssignmentResult, 
  AssignmentHistoryItem,
  ChannelType,
  AssignableEntitiesResponse
} from '@/app/[locale]/(dashboard)/oneinbox/types/unified-inbox'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'

// API response types
interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  message?: string
}

// Convert frontend channel type to API conversation type
function toApiConversationType(channel: ChannelType): string {
  return channel.toUpperCase()
}

// Convert API response dates to Date objects
function parseAssignmentResult(data: any): AssignmentResult {
  return {
    ...data,
    assignedAt: new Date(data.assignedAt),
    // Ensure assigneeType defaults to HUMAN for backward compatibility
    assigneeType: data.assigneeType || 'HUMAN'
  }
}

function parseAssignmentHistoryItem(data: any): AssignmentHistoryItem {
  return {
    ...data,
    assignedAt: new Date(data.assignedAt),
    unassignedAt: data.unassignedAt ? new Date(data.unassignedAt) : null,
    // Ensure assigneeType defaults to HUMAN for backward compatibility
    assigneeType: data.assigneeType || 'HUMAN'
  }
}

export const assignmentApi = {
  /**
   * Get current assignment for a conversation
   * Requirements: 2.2
   */
  async getAssignment(
    conversationId: string,
    conversationType: ChannelType
  ): Promise<AssignmentResult | null> {
    const apiType = toApiConversationType(conversationType)
    
    const response = await fetch(
      `${API_URL}/api/v1/assignments/${apiType}/${conversationId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Get assignment error:', error)
      throw new Error(error.error?.message || 'Failed to fetch assignment')
    }

    const result: ApiResponse<any> = await response.json()
    
    if (!result.data) {
      return null
    }

    return parseAssignmentResult(result.data)
  },

  /**
   * Assign a conversation to a user or AI Agent
   * Requirements: 1.4, 2.2
   * @param type - 'human' for team member (default), 'ai' for AI Agent
   * @param id - assigneeId for human, aiAgentId for AI Agent
   */
  async assignConversation(
    conversationId: string,
    conversationType: ChannelType,
    id: string,
    type: 'human' | 'ai' = 'human'
  ): Promise<AssignmentResult> {
    const apiType = toApiConversationType(conversationType)
    
    // Build request body based on assignment type
    const body = type === 'human' 
      ? { assigneeId: id }
      : { aiAgentId: id }
    
    const response = await fetch(
      `${API_URL}/api/v1/assignments/${apiType}/${conversationId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Assign conversation error:', error)
      throw new Error(error.error?.message || 'Failed to assign conversation')
    }

    const result: ApiResponse<any> = await response.json()
    
    if (!result.data) {
      throw new Error('No assignment data returned')
    }

    return parseAssignmentResult(result.data)
  },

  /**
   * Assign a conversation to a human user (convenience method)
   * Requirements: 2.2
   */
  async assignToHuman(
    conversationId: string,
    conversationType: ChannelType,
    assigneeId: string
  ): Promise<AssignmentResult> {
    return this.assignConversation(conversationId, conversationType, assigneeId, 'human')
  },

  /**
   * Assign a conversation to an AI Agent
   * Requirements: 1.4
   */
  async assignToAIAgent(
    conversationId: string,
    conversationType: ChannelType,
    aiAgentId: string
  ): Promise<AssignmentResult> {
    return this.assignConversation(conversationId, conversationType, aiAgentId, 'ai')
  },

  /**
   * Unassign a conversation
   * Requirements: 3.1
   */
  async unassignConversation(
    conversationId: string,
    conversationType: ChannelType
  ): Promise<void> {
    const apiType = toApiConversationType(conversationType)
    
    const response = await fetch(
      `${API_URL}/api/v1/assignments/${apiType}/${conversationId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Unassign conversation error:', error)
      throw new Error(error.error?.message || 'Failed to unassign conversation')
    }
  },

  /**
   * Get list of users that can be assigned to conversations
   * Requirements: 2.1
   */
  async getAssignableUsers(): Promise<AssignableUser[]> {
    const response = await fetch(
      `${API_URL}/api/v1/assignments/assignable-users`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Get assignable users error:', error)
      throw new Error(error.error?.message || 'Failed to fetch assignable users')
    }

    const result: ApiResponse<AssignableUser[]> = await response.json()
    
    return result.data || []
  },

  /**
   * Get list of all assignable entities (humans + AI agents)
   * Returns structured response with humans and aiAgents arrays
   * Requirements: 1.1
   */
  async fetchAssignableEntities(): Promise<AssignableEntitiesResponse> {
    const response = await fetch(
      `${API_URL}/api/v1/assignments/assignable-entities`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Get assignable entities error:', error)
      throw new Error(error.error?.message || 'Failed to fetch assignable entities')
    }

    const result: ApiResponse<AssignableEntitiesResponse> = await response.json()
    
    return result.data || { humans: [], aiAgents: [] }
  },

  /**
   * Get assignment history for a conversation
   * Requirements: 8.2
   */
  async getAssignmentHistory(
    conversationId: string,
    conversationType: ChannelType
  ): Promise<AssignmentHistoryItem[]> {
    const apiType = toApiConversationType(conversationType)
    
    const response = await fetch(
      `${API_URL}/api/v1/assignments/${apiType}/${conversationId}/history`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      console.error('Get assignment history error:', error)
      throw new Error(error.error?.message || 'Failed to fetch assignment history')
    }

    const result: ApiResponse<any[]> = await response.json()
    
    if (!result.data) {
      return []
    }

    return result.data.map(parseAssignmentHistoryItem)
  },
}
