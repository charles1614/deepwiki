import { PrismaClient } from '@prisma/client'

/**
 * Utilities for cleaning up test data
 * Provides granular control over what data to clean
 */

/**
 * Clean up test users
 */
export async function cleanupTestUsers(
  prisma: PrismaClient,
  options: {
    emailPrefix?: string
    emailPattern?: string
    userIds?: string[]
  } = {}
): Promise<number> {
  const { emailPrefix = 'test-', emailPattern, userIds } = options

  const where: any = {}

  if (userIds && userIds.length > 0) {
    where.id = { in: userIds }
  } else if (emailPattern) {
    where.email = { contains: emailPattern }
  } else {
    where.email = { startsWith: emailPrefix }
  }

  const result = await prisma.user.deleteMany({ where })
  return result.count
}

/**
 * Clean up test wikis
 */
export async function cleanupTestWikis(
  prisma: PrismaClient,
  options: {
    titlePrefix?: string
    slugPrefix?: string
    wikiIds?: string[]
    ownerId?: string
  } = {}
): Promise<number> {
  const { titlePrefix = '[TEST]', slugPrefix = 'test-', wikiIds, ownerId } = options

  const where: any = {
    OR: [],
  }

  if (wikiIds && wikiIds.length > 0) {
    where.OR.push({ id: { in: wikiIds } })
  } else {
    if (titlePrefix) {
      where.OR.push({ title: { startsWith: titlePrefix } })
    }
    if (slugPrefix) {
      where.OR.push({ slug: { startsWith: slugPrefix } })
    }
  }

  if (ownerId) {
    where.ownerId = ownerId
  }

  // Delete versions first (foreign key constraint)
  await prisma.wikiVersion.deleteMany({
    where: {
      file: {
        wiki: where,
      },
    },
  })

  // Delete files
  await prisma.wikiFile.deleteMany({
    where: {
      wiki: where,
    },
  })

  // Delete wikis
  const result = await prisma.wiki.deleteMany({ where })
  return result.count
}

/**
 * Clean up test wiki files
 */
export async function cleanupTestWikiFiles(
  prisma: PrismaClient,
  options: {
    fileIds?: string[]
    wikiId?: string
    filenamePattern?: string
  } = {}
): Promise<number> {
  const { fileIds, wikiId, filenamePattern } = options

  const where: any = {}

  if (fileIds && fileIds.length > 0) {
    where.id = { in: fileIds }
  } else if (wikiId) {
    where.wikiId = wikiId
  } else if (filenamePattern) {
    where.filename = { contains: filenamePattern }
  }

  // Delete versions first
  await prisma.wikiVersion.deleteMany({
    where: {
      fileId: where.id || { in: fileIds || [] },
    },
  })

  const result = await prisma.wikiFile.deleteMany({ where })
  return result.count
}

/**
 * Clean up test wiki versions
 */
export async function cleanupTestWikiVersions(
  prisma: PrismaClient,
  options: {
    versionIds?: string[]
    fileId?: string
    authorId?: string
  } = {}
): Promise<number> {
  const { versionIds, fileId, authorId } = options

  const where: any = {}

  if (versionIds && versionIds.length > 0) {
    where.id = { in: versionIds }
  } else {
    if (fileId) {
      where.fileId = fileId
    }
    if (authorId) {
      where.authorId = authorId
    }
  }

  const result = await prisma.wikiVersion.deleteMany({ where })
  return result.count
}

/**
 * Clean up all test data for a specific test run
 * Useful for cleaning up after a specific test
 */
export async function cleanupTestRun(
  prisma: PrismaClient,
  testRunId: string
): Promise<void> {
  const prefix = `[TEST-${testRunId}]`

  // Clean up in dependency order
  await prisma.wikiVersion.deleteMany({
    where: {
      file: {
        wiki: {
          title: { startsWith: prefix },
        },
      },
    },
  })

  await prisma.wikiFile.deleteMany({
    where: {
      wiki: {
        title: { startsWith: prefix },
      },
    },
  })

  await prisma.wiki.deleteMany({
    where: {
      title: { startsWith: prefix },
    },
  })

  await prisma.user.deleteMany({
    where: {
      email: { startsWith: `test-${testRunId}-` },
    },
  })
}

/**
 * Clean up data created by a specific user
 */
export async function cleanupUserData(
  prisma: PrismaClient,
  userId: string
): Promise<void> {
  // Get all wikis owned by user
  const wikis = await prisma.wiki.findMany({
    where: { ownerId: userId },
    select: { id: true },
  })

  const wikiIds = wikis.map((w) => w.id)

  if (wikiIds.length > 0) {
    // Delete versions
    await prisma.wikiVersion.deleteMany({
      where: {
        file: {
          wikiId: { in: wikiIds },
        },
      },
    })

    // Delete files
    await prisma.wikiFile.deleteMany({
      where: {
        wikiId: { in: wikiIds },
      },
    })

    // Delete wikis
    await prisma.wiki.deleteMany({
      where: {
        id: { in: wikiIds },
      },
    })
  }

  // Delete versions created by user
  await prisma.wikiVersion.deleteMany({
    where: {
      authorId: userId,
    },
  })

  // Delete user
  await prisma.user.delete({
    where: { id: userId },
  })
}

/**
 * Get count of test data
 */
export async function getTestDataCount(prisma: PrismaClient): Promise<{
  users: number
  wikis: number
  files: number
  versions: number
}> {
  const [users, wikis, files, versions] = await Promise.all([
    prisma.user.count({
      where: {
        OR: [
          { email: { startsWith: 'test-' } },
          { email: { contains: '@test.' } },
        ],
      },
    }),
    prisma.wiki.count({
      where: {
        OR: [
          { title: { startsWith: '[TEST]' } },
          { slug: { startsWith: 'test-' } },
        ],
      },
    }),
    prisma.wikiFile.count({
      where: {
        wiki: {
          OR: [
            { title: { startsWith: '[TEST]' } },
            { slug: { startsWith: 'test-' } },
          ],
        },
      },
    }),
    prisma.wikiVersion.count({
      where: {
        file: {
          wiki: {
            OR: [
              { title: { startsWith: '[TEST]' } },
              { slug: { startsWith: 'test-' } },
            ],
          },
        },
      },
    }),
  ])

  return { users, wikis, files, versions }
}

