import { PrismaClient } from '@prisma/client'

declare global {
  // This prevents us from making multiple connections to the DB during development
  // biome-ignore lint/suspicious/noRedeclare: global declaration
  var __prisma: PrismaClient | undefined
}

// Create Prisma client instance with optimized connection pool settings
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['error', 'warn'] 
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// In development, hot reload can cause multiple instances
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect()
})

export default prisma
