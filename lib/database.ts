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