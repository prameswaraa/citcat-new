import { Hono } from 'hono'
import type { Context } from 'hono'
import { prisma } from '../../utils/database.js'
import { getEffectiveUserId } from '../../middleware/resolveContext.js'

const app = new Hono()

// GET /api/v1/messages - List messages
app.get('/', async (c: Context) => {
  try {
    if (!c.user) {
      return c.json({ 
        error: { 
          code: 'Unauthorized', 
          message: 'Authentication required' 
        } 
      }, 401)
    }

    // Use effectiveUserId for agents to access business owner's data
    // Requirements: 5.3, 6.2
    const effectiveUserId = getEffectiveUserId(c)
    const customerId = c.req.query('customerId')
    const isAgent = c.user.role === 'AGENT'
    const agentUserId = c.user.id

    // For agents, first get the list of customer IDs assigned to them
    let assignedCustomerIds: string[] = []
    if (isAgent) {
      const agentAssignments = await prisma.conversationAssignment.findMany({
        where: {
          businessOwnerId: effectiveUserId,
          conversationType: 'WHATSAPP',
          assigneeId: agentUserId,
          assigneeType: 'HUMAN',
          unassignedAt: null, // Only active assignments
        },
        select: {
          conversationId: true, // This is the customer ID for WhatsApp
        }
      })
      assignedCustomerIds = agentAssignments.map(a => a.conversationId)
      
      // If agent has no assignments, return empty result
      if (assignedCustomerIds.length === 0) {
        return c.json({ 
          success: true, 
          data: [],
          unreadCounts: {},
          assignments: {}
        })
      }
    }

    // Build the where clause
    const where: any = { userId: effectiveUserId }
    if (customerId) {
      where.customerId = customerId
    }
    // For agents, filter to only show messages from assigned customers
    if (isAgent && assignedCustomerIds.length > 0) {
      where.customerId = { in: assignedCustomerIds }
    }

    // Fetch messages, unread counts, and assignments in parallel
    // Requirements: 5.1, 5.2 - Calculate unread counts efficiently using database queries
    // 
    // FIX: Previously we were limiting to 100 messages, which caused conversations to be missing
    // when one customer had many messages. Now we:
    // 1. First get all unique customer IDs with recent messages (limited to 200 conversations)
    // 2. Then fetch messages only for those customers
    // This ensures all conversations are visible, not just those with recent messages in the top 100
    
    // Step 1: Get unique customer IDs ordered by most recent message
    const recentCustomers = await prisma.message.findMany({
      where,
      select: {
        customerId: true,
        timestamp: true,
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['customerId'],
      take: 200, // Limit to 200 unique conversations
    })
    
    const customerIds = recentCustomers.map(c => c.customerId)
    
    // Step 2: Fetch messages for these customers (with a higher limit to ensure all recent messages)
    const [messages, unreadCountsRaw, assignmentsRaw] = await Promise.all([
      prisma.message.findMany({
        where: {
          ...where,
          customerId: { in: customerIds.length > 0 ? customerIds : ['__none__'] }
        },
        include: {
          customer: {
            select: {
              id: true,
              phoneNumber: true,
              name: true,
              whatsappPhoneNumberId: true,
              whatsappPhoneNumber: {
                select: {
                  id: true,
                  displayPhoneNumber: true,
                  phoneNumberId: true,
                }
              }
            }
          },
          user: {
            select: { 
              id: true, 
              name: true, 
              email: true 
            }
          },
          template: {
            select: { 
              id: true, 
              templateName: true, 
              category: true 
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 2000 // Higher limit since we're fetching for specific customers
      }),
      // Calculate unread counts per customer
      // Requirements: 1.1, 5.1 - Count INBOUND messages with status NOT equal to READ
      prisma.message.groupBy({
        by: ['customerId'],
        where: {
          userId: effectiveUserId,
          direction: 'INBOUND',
          status: { not: 'READ' },
          // For agents, only count unread from assigned customers
          ...(isAgent && assignedCustomerIds.length > 0 ? { customerId: { in: assignedCustomerIds } } : {})
        },
        _count: { id: true }
      }),
      // Fetch active assignments for WhatsApp conversations
      prisma.conversationAssignment.findMany({
        where: {
          businessOwnerId: effectiveUserId,
          conversationType: 'WHATSAPP',
          unassignedAt: null, // Only active assignments
          // For agents, only show assignments for their assigned customers
          ...(isAgent && assignedCustomerIds.length > 0 ? { conversationId: { in: assignedCustomerIds } } : {})
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              image: true,
            }
          },
          aiAgent: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      })
    ])

    // Transform unread counts to Record<string, number>
    const unreadCounts: Record<string, number> = {}
    for (const item of unreadCountsRaw) {
      unreadCounts[item.customerId] = item._count.id
    }

    // Transform assignments to Record<conversationId, assignment>
    // Support both HUMAN and AI_AGENT assignment types
    const assignments: Record<string, {
      assigneeId: string | null
      assigneeName: string | null
      assigneeImage: string | null
      assigneeType: string
      aiAgentId: string | null
      aiAgentName: string | null
      assignedAt: Date
    }> = {}
    for (const assignment of assignmentsRaw) {
      // Handle both HUMAN and AI_AGENT assignment types
      const isAIAgent = assignment.assigneeType === 'AI_AGENT'
      assignments[assignment.conversationId] = {
        assigneeId: assignment.assigneeId,
        assigneeName: assignment.assignee?.name ?? null,
        assigneeImage: assignment.assignee?.image ?? null,
        assigneeType: assignment.assigneeType,
        aiAgentId: assignment.aiAgentId,
        aiAgentName: assignment.aiAgent?.name ?? null,
        assignedAt: assignment.assignedAt,
      }
    }

    return c.json({ 
      success: true, 
      data: messages,
      unreadCounts,
      assignments
    })
  } catch (error) {
    console.error('List messages error:', error)
    return c.json({ 
      error: { 
        code: 'InternalServerError', 
        message: 'Failed to fetch messages' 
      } 
    }, 500)
  }
})

export default app
