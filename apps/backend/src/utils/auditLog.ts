import { prisma } from './database.js'

export async function auditLog(
  action: string,
  entityType: string,
  entityId: string,
  details?: any,
  userId?: string,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
        userId,
        ipAddress
      }
    })
  } catch (error) {
    // Don't throw here to avoid disrupting the main flow
    console.error('Failed to create audit log:', error)
  }
}
