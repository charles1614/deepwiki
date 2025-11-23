import { PrismaClient } from '@prisma/client'
import { RetryExtension } from './prisma-retry'

function createPrismaClient() {
  // Handle build-time data collection skipping
  // This prevents Prisma from throwing an error when DATABASE_URL is missing during Docker build
  const databaseUrl = process.env.DATABASE_URL ||
    (process.env.NEXT_BUILD_SKIP_DATA_COLLECTION ? 'postgresql://dummy:dummy@localhost:5432/dummy' : undefined);

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
  return client.$extends(RetryExtension())
}

// Global singleton holder
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}