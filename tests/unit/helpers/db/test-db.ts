import { PrismaClient } from '@prisma/client'

/**
 * Database setup and teardown utilities for integration tests
 * These helpers ensure proper test isolation and cleanup
 */

const TEST_MARKER_PREFIX = '[TEST]'

/**
 * Get a test database connection
 * Uses the same Prisma client but with test-specific operations
 */
export function getTestDb(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'test' ? [] : ['error'],
  })
}

/**
 * Clean up all test data from the database
 * Removes data marked with test markers
 */
export async function cleanupTestData(prisma: PrismaClient): Promise<void> {
  // Delete in order to respect foreign key constraints
  await prisma.wikiVersion.deleteMany({
    where: {
      OR: [
        { file: { wiki: { title: { startsWith: TEST_MARKER_PREFIX } } } },
        { file: { wiki: { slug: { startsWith: 'test-' } } } },
      ],
    },
  })

  await prisma.wikiFile.deleteMany({
    where: {
      OR: [
        { wiki: { title: { startsWith: TEST_MARKER_PREFIX } } },
        { wiki: { slug: { startsWith: 'test-' } } },
      ],
    },
  })

  await prisma.wiki.deleteMany({
    where: {
      OR: [
        { title: { startsWith: TEST_MARKER_PREFIX } },
        { slug: { startsWith: 'test-' } },
      ],
    },
  })

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: 'test-' } },
        { email: { contains: '@test.' } },
      ],
    },
  })
}

/**
 * Setup test database before tests
 * Cleans existing test data and optionally seeds initial data
 */
export async function setupTestDatabase(
  prisma: PrismaClient,
  options: {
    cleanup?: boolean
    seedData?: () => Promise<void>
  } = {}
): Promise<void> {
  const { cleanup = true, seedData } = options

  if (cleanup) {
    await cleanupTestData(prisma)
  }

  if (seedData) {
    await seedData()
  }
}

/**
 * Teardown test database after tests
 * Cleans up test data and optionally disconnects
 */
export async function teardownTestDatabase(
  prisma: PrismaClient,
  options: {
    cleanup?: boolean
    disconnect?: boolean
  } = {}
): Promise<void> {
  const { cleanup = true, disconnect = false } = options

  if (cleanup) {
    await cleanupTestData(prisma)
  }

  if (disconnect) {
    await prisma.$disconnect()
  }
}

/**
 * Create a test transaction wrapper
 * Rolls back all changes after test completes
 */
export async function withTestTransaction<T>(
  prisma: PrismaClient,
  testFn: (tx: PrismaClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    try {
      return await testFn(tx as PrismaClient)
    } catch (error) {
      // Transaction will automatically rollback
      throw error
    }
  })
}

/**
 * Mark data as test data by adding test marker
 */
export function markAsTestData(data: { title?: string; slug?: string; email?: string }): {
  title?: string
  slug?: string
  email?: string
} {
  const marked: any = {}

  if (data.title) {
    marked.title = `${TEST_MARKER_PREFIX} ${data.title}`
  }

  if (data.slug) {
    marked.slug = `test-${data.slug}`
  }

  if (data.email) {
    marked.email = data.email.includes('@') 
      ? data.email.replace('@', '@test.')
      : `test-${data.email}`
  }

  return { ...data, ...marked }
}

/**
 * Check if data is test data
 */
export function isTestData(data: {
  title?: string
  slug?: string
  email?: string
}): boolean {
  if (data.title?.startsWith(TEST_MARKER_PREFIX)) {
    return true
  }

  if (data.slug?.startsWith('test-')) {
    return true
  }

  if (data.email?.includes('@test.') || data.email?.startsWith('test-')) {
    return true
  }

  return false
}

/**
 * Create a test database helper that automatically handles setup/teardown
 */
export function createTestDbHelper(prisma: PrismaClient) {
  return {
    /**
     * Clean up test data
     */
    cleanup: () => cleanupTestData(prisma),

    /**
     * Setup test database
     */
    setup: (options?: { cleanup?: boolean; seedData?: () => Promise<void> }) =>
      setupTestDatabase(prisma, options),

    /**
     * Teardown test database
     */
    teardown: (options?: { cleanup?: boolean; disconnect?: boolean }) =>
      teardownTestDatabase(prisma, options),

    /**
     * Run test in transaction (auto-rollback)
     */
    withTransaction: <T>(testFn: (tx: PrismaClient) => Promise<T>) =>
      withTestTransaction(prisma, testFn),

    /**
     * Mark data as test data
     */
    markAsTest: markAsTestData,

    /**
     * Check if data is test data
     */
    isTest: isTestData,
  }
}

