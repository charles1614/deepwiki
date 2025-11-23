import { PrismaClient } from '@prisma/client'

/**
 * Mock Prisma client builder for unit tests
 * Provides type-safe mocks for Prisma operations
 */

export type MockPrismaClient = {
  user: any
  wiki: any
  wikiFile: any
  wikiVersion: any
  systemSetting: any
  $connect: jest.Mock
  $disconnect: jest.Mock
  $transaction: jest.Mock
  $use: jest.Mock
  $on: jest.Mock
  $extends: jest.Mock
}

/**
 * Create a fully mocked Prisma client
 * All methods are mocked and can be configured per test
 * 
 * @example
 * ```ts
 * const mockPrisma = createMockPrisma()
 * mockPrisma.user.findUnique.mockResolvedValue(createUser())
 * ```
 */
export function createMockPrisma(): MockPrismaClient {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    wiki: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    wikiFile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    wikiVersion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    systemSetting: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $use: jest.fn(),
    $on: jest.fn(),
    $extends: jest.fn(),
  } as unknown as MockPrismaClient
}

/**
 * Create a partial mock Prisma client
 * Only specified models are mocked
 */
export function createPartialMockPrisma(
  models: Array<keyof PrismaClient>
): Partial<MockPrismaClient> {
  const mockPrisma = {} as Partial<MockPrismaClient>

  const modelMocks = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wiki: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wikiFile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    wikiVersion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  models.forEach((model) => {
    if (model in modelMocks) {
      mockPrisma[model as keyof PrismaClient] = modelMocks[model as keyof typeof modelMocks] as any
    }
  })

  return mockPrisma
}

/**
 * Setup default mock implementations for common Prisma operations
 */
export function setupDefaultPrismaMocks(mockPrisma: any): void {
  // Default user mocks
  if (mockPrisma.user) {
    mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null)
    mockPrisma.user.findMany = jest.fn().mockResolvedValue([])
    mockPrisma.user.create = jest.fn().mockResolvedValue({
    id: 'mock-user-id',
    email: 'mock@example.com',
    password: 'hashed',
    role: 'USER',
    createdAt: new Date(),
    updatedAt: new Date(),
    })
  }

  // Default wiki mocks
  if (mockPrisma.wiki) {
    mockPrisma.wiki.findUnique = jest.fn().mockResolvedValue(null)
    mockPrisma.wiki.findMany = jest.fn().mockResolvedValue([])
    mockPrisma.wiki.create = jest.fn().mockResolvedValue({
    id: 'mock-wiki-id',
    title: 'Mock Wiki',
    slug: 'mock-wiki',
    description: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ownerId: 'mock-user-id',
    })
  }

  // Default wiki file mocks
  if (mockPrisma.wikiFile) {
    mockPrisma.wikiFile.findUnique = jest.fn().mockResolvedValue(null)
    mockPrisma.wikiFile.findMany = jest.fn().mockResolvedValue([])
    mockPrisma.wikiFile.create = jest.fn().mockResolvedValue({
    id: 'mock-file-id',
    wikiId: 'mock-wiki-id',
    filename: 'index.md',
    originalName: 'index.md',
    size: 1024,
    url: 'https://example.com/file',
    uploadedAt: new Date(),
    updatedAt: new Date(),
    })
  }

  // Default version mocks
  if (mockPrisma.wikiVersion) {
    mockPrisma.wikiVersion.findUnique = jest.fn().mockResolvedValue(null)
    mockPrisma.wikiVersion.findMany = jest.fn().mockResolvedValue([])
    mockPrisma.wikiVersion.create = jest.fn().mockResolvedValue({
    id: 'mock-version-id',
    fileId: 'mock-file-id',
    versionNumber: 1,
    content: '# Content',
    changeType: 'CREATE',
    changeDescription: null,
    authorId: 'mock-user-id',
    contentSize: 10,
    checksum: 'mock-checksum',
    createdAt: new Date(),
    })
  }
}

/**
 * Reset all Prisma mocks to default state
 */
export function resetPrismaMocks(mockPrisma: MockPrismaClient): void {
  Object.keys(mockPrisma).forEach((key) => {
    const model = mockPrisma[key as keyof PrismaClient] as any
    if (model && typeof model === 'object' && 'mockReset' in model) {
      model.mockReset()
    }
  })
}

/**
 * Create a mock Prisma client with default implementations
 */
export function createMockPrismaWithDefaults(): MockPrismaClient {
  const mockPrisma = createMockPrisma()
  setupDefaultPrismaMocks(mockPrisma)
  return mockPrisma
}

