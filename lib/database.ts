import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  shutdownHandler: (() => void) | undefined
}

// Create Prisma client with better connection management
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  })

// Prevent multiple instances in development (hot reload protection)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Handle graceful shutdown - only add listener once
if (typeof process !== 'undefined' && !globalForPrisma.shutdownHandler) {
  const shutdownHandler = async () => {
    await prisma.$disconnect()
  }

  // Add multiple event listeners to ensure cleanup in different scenarios
  process.on('beforeExit', shutdownHandler)
  process.on('SIGINT', shutdownHandler)
  process.on('SIGTERM', shutdownHandler)

  // Store reference to prevent adding duplicate listeners
  globalForPrisma.shutdownHandler = shutdownHandler
}