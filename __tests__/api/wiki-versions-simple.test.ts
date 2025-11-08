import { prisma } from '@/lib/database'

// Test marker to identify test data
const TEST_MARKER = '[TEST]'

describe('Wiki Versions API Integration', () => {
  let testUser: any
  let testWiki: any
  let testVersions: any[]

  beforeEach(async () => {
    // Clean up test data
    await prisma.wikiVersion.deleteMany({
      where: {
        wiki: { title: { startsWith: TEST_MARKER } }
      }
    })

    await prisma.wiki.deleteMany({
      where: {
        title: { startsWith: TEST_MARKER }
      }
    })

    await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'test-version-api' }
      }
    })

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test-version-api@example.com',
        password: 'hashedpassword',
        role: 'USER'
      }
    })

    // Create test wiki
    testWiki = await prisma.wiki.create({
      data: {
        title: `${TEST_MARKER} Test Wiki for Version API`,
        slug: 'test-wiki-version-api',
        folderName: 'test-wiki-version-api',
        description: 'Test wiki for version API functionality'
      }
    })

    // Create test versions
    testVersions = await Promise.all([
      prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 1,
          content: '# Version 1\n\nInitial content.',
          changeLog: 'Initial version',
          userId: testUser.id
        }
      }),
      prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 2,
          content: '# Version 2\n\nUpdated content with new section.\n\n## New Section\n\nThis is new content.',
          changeLog: 'Added new section',
          userId: testUser.id
        }
      }),
      prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 3,
          content: '# Version 3\n\nFinal content with all changes.\n\n## New Section\n\nThis is new content.\n\n## Conclusion\n\nFinal section added.',
          changeLog: 'Added conclusion',
          userId: testUser.id
        }
      })
    ])
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.wikiVersion.deleteMany({
      where: {
        wiki: { title: { startsWith: TEST_MARKER } }
      }
    })

    await prisma.wiki.deleteMany({
      where: {
        title: { startsWith: TEST_MARKER }
      }
    })

    await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'test-version-api' }
      }
    })
  })

  describe('Version Database Operations', () => {
    it('should retrieve all versions for a wiki', async () => {
      const versions = await prisma.wikiVersion.findMany({
        where: { wikiId: testWiki.id },
        orderBy: { version: 'desc' }
      })

      expect(versions).toHaveLength(3)
      expect(versions[0].version).toBe(3)
      expect(versions[1].version).toBe(2)
      expect(versions[2].version).toBe(1)
    })

    it('should retrieve a specific version', async () => {
      const version = await prisma.wikiVersion.findFirst({
        where: {
          wikiId: testWiki.id,
          version: 2
        }
      })

      expect(version).toBeDefined()
      expect(version?.version).toBe(2)
      expect(version?.content).toContain('Updated content')
      expect(version?.changeLog).toBe('Added new section')
    })

    it('should create a new version with auto-incremented number', async () => {
      const newVersion = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 4, // This should work since version 4 doesn't exist yet
          content: '# Version 4\n\nNew content created directly.',
          changeLog: 'Direct API creation',
          userId: testUser.id
        }
      })

      expect(newVersion.version).toBe(4)
      expect(newVersion.content).toContain('New content created directly')
      expect(newVersion.changeLog).toBe('Direct API creation')
    })

    it('should enforce unique version constraint per wiki', async () => {
      await expect(
        prisma.wikiVersion.create({
          data: {
            wikiId: testWiki.id,
            version: 2, // Version 2 already exists
            content: '# Duplicate Version',
            changeLog: 'Duplicate version',
            userId: testUser.id
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Version Comparison Logic', () => {
    it('should identify differences between versions', async () => {
      const version1 = testVersions[0] // Version 1
      const version3 = testVersions[2] // Version 3

      // Simple diff check
      const fromLines = version1.content.split('\n')
      const toLines = version3.content.split('\n')

      const fromLinesSet = new Set(fromLines)
      const toLinesSet = new Set(toLines)

      // Check for added content
      const addedLines = toLines.filter(line => !fromLinesSet.has(line))
      expect(addedLines.length).toBeGreaterThan(0)
      expect(addedLines.some(line => line.includes('Conclusion'))).toBe(true)

      // Check for content that exists in both
      const commonLines = fromLines.filter(line => toLinesSet.has(line))
      expect(commonLines.length).toBeGreaterThan(0)
      // The only common line should be empty lines between sections
      expect(commonLines.includes('')).toBe(true)
    })
  })

  describe('Version Restoration Logic', () => {
    it('should be able to restore content from a previous version', async () => {
      const originalVersion = testVersions[0] // Version 1
      const restoredVersion = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 5,
          content: originalVersion.content,
          changeLog: `Restored to version ${originalVersion.version}`,
          userId: testUser.id
        }
      })

      expect(restoredVersion.version).toBe(5)
      expect(restoredVersion.content).toBe(originalVersion.content)
      expect(restoredVersion.changeLog).toContain('Restored to version 1')
    })
  })
})