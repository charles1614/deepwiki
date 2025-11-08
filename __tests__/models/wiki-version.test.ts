import { prisma } from '@/lib/database'

// Test marker to identify test data
const TEST_MARKER = '[TEST]'

describe('Wiki Version History Model', () => {
  let testWiki: any
  let testUser: any

  beforeEach(async () => {
    // Clean up test data
    await prisma.wikiVersion.deleteMany({
      where: {
        OR: [
          { wiki: { title: { startsWith: TEST_MARKER } } },
          { wiki: { slug: { startsWith: 'test-' } } }
        ]
      }
    })

    await prisma.wiki.deleteMany({
      where: {
        OR: [
          { title: { startsWith: TEST_MARKER } },
          { slug: { startsWith: 'test-' } },
          { folderName: { startsWith: 'test-' } }
        ]
      }
    })

    await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'test-' }
      }
    })

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test-version-user@example.com',
        password: 'hashedpassword',
        role: 'USER'
      }
    })

    // Create test wiki
    testWiki = await prisma.wiki.create({
      data: {
        title: `${TEST_MARKER} Test Wiki for Versioning`,
        slug: 'test-wiki-versioning',
        folderName: 'test-wiki-versioning',
        description: 'Test wiki for version history functionality'
      }
    })
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.wikiVersion.deleteMany({
      where: {
        OR: [
          { wiki: { title: { startsWith: TEST_MARKER } } },
          { wiki: { slug: { startsWith: 'test-' } } }
        ]
      }
    })

    await prisma.wiki.deleteMany({
      where: {
        OR: [
          { title: { startsWith: TEST_MARKER } },
          { slug: { startsWith: 'test-' } },
          { folderName: { startsWith: 'test-' } }
        ]
      }
    })

    await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'test-version-user' }
      }
    })
  })

  describe('Creating Wiki Versions', () => {
    it('should create a wiki version with required fields', async () => {
      const version = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 1,
          content: '# Initial Content\n\nThis is the first version.',
          changeLog: 'Initial version',
          userId: testUser.id
        }
      })

      expect(version).toBeDefined()
      expect(version.wikiId).toBe(testWiki.id)
      expect(version.version).toBe(1)
      expect(version.content).toBe('# Initial Content\n\nThis is the first version.')
      expect(version.changeLog).toBe('Initial version')
      expect(version.userId).toBe(testUser.id)
      expect(version.createdAt).toBeDefined()
    })

    it('should create multiple versions for the same wiki', async () => {
      // Create first version
      const version1 = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 1,
          content: '# Version 1\n\nFirst content.',
          changeLog: 'First version',
          userId: testUser.id
        }
      })

      // Create second version
      const version2 = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 2,
          content: '# Version 2\n\nUpdated content with new information.',
          changeLog: 'Added new information',
          userId: testUser.id
        }
      })

      expect(version1.version).toBe(1)
      expect(version2.version).toBe(2)
      expect(version1.content).not.toBe(version2.content)
    })

    it('should enforce version uniqueness per wiki', async () => {
      // Create first version
      await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 1,
          content: '# Version 1',
          changeLog: 'First version',
          userId: testUser.id
        }
      })

      // Try to create another version with same version number
      await expect(
        prisma.wikiVersion.create({
          data: {
            wikiId: testWiki.id,
            version: 1,
            content: '# Duplicate Version',
            changeLog: 'Duplicate version',
            userId: testUser.id
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Querying Wiki Versions', () => {
    let versions: any[] = []

    beforeEach(async () => {
      // Create multiple versions for testing
      versions = await Promise.all([
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
            content: '# Version 2\n\nUpdated content.',
            changeLog: 'Updated with new section',
            userId: testUser.id
          }
        }),
        prisma.wikiVersion.create({
          data: {
            wikiId: testWiki.id,
            version: 3,
            content: '# Version 3\n\nFinal content with all changes.',
            changeLog: 'Added conclusion section',
            userId: testUser.id
          }
        })
      ])
    })

    it('should retrieve all versions for a wiki ordered by version descending', async () => {
      const wikiVersions = await prisma.wikiVersion.findMany({
        where: { wikiId: testWiki.id },
        orderBy: { version: 'desc' }
      })

      expect(wikiVersions).toHaveLength(3)
      expect(wikiVersions[0].version).toBe(3)
      expect(wikiVersions[1].version).toBe(2)
      expect(wikiVersions[2].version).toBe(1)
    })

    it('should retrieve the latest version for a wiki', async () => {
      const latestVersion = await prisma.wikiVersion.findFirst({
        where: { wikiId: testWiki.id },
        orderBy: { version: 'desc' }
      })

      expect(latestVersion?.version).toBe(3)
      expect(latestVersion?.content).toContain('Final content')
    })

    it('should retrieve a specific version by wiki and version number', async () => {
      const specificVersion = await prisma.wikiVersion.findFirst({
        where: {
          wikiId: testWiki.id,
          version: 2
        }
      })

      expect(specificVersion?.version).toBe(2)
      expect(specificVersion?.content).toContain('Updated content')
    })
  })

  describe('Version Comparison', () => {
    let version1: any, version2: any

    beforeEach(async () => {
      version1 = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 1,
          content: '# Title\n\nSection 1 content.\n\nSection 2 content.',
          changeLog: 'Initial version',
          userId: testUser.id
        }
      })

      version2 = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 2,
          content: '# Updated Title\n\nSection 1 updated content.\n\nSection 2 content.\n\nSection 3 new content.',
          changeLog: 'Updated title and added section 3',
          userId: testUser.id
        }
      })
    })

    it('should be able to compare two versions and identify differences', async () => {
      // This test verifies that we can retrieve both versions for comparison
      const versions = await prisma.wikiVersion.findMany({
        where: { wikiId: testWiki.id },
        orderBy: { version: 'asc' }
      })

      expect(versions).toHaveLength(2)

      const [first, second] = versions
      expect(first.content).not.toBe(second.content)

      // Verify specific differences
      expect(first.content).toContain('Title')
      expect(second.content).toContain('Updated Title')
      expect(first.content).not.toContain('Section 3')
      expect(second.content).toContain('Section 3')
    })
  })

  describe('Version Restoration', () => {
    let oldVersion: any, newVersion: any

    beforeEach(async () => {
      oldVersion = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 1,
          content: '# Original Title\n\nOriginal content section.',
          changeLog: 'Original version',
          userId: testUser.id
        }
      })

      newVersion = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 2,
          content: '# Modified Title\n\nModified content section.\n\nAdditional section.',
          changeLog: 'Modified and added content',
          userId: testUser.id
        }
      })
    })

    it('should be able to restore a wiki to a previous version', async () => {
      // Simulate restoration by creating a new version with old content
      const restoredVersion = await prisma.wikiVersion.create({
        data: {
          wikiId: testWiki.id,
          version: 3,
          content: oldVersion.content,
          changeLog: 'Restored to version 1',
          userId: testUser.id
        }
      })

      expect(restoredVersion.version).toBe(3)
      expect(restoredVersion.content).toBe(oldVersion.content)
      expect(restoredVersion.changeLog).toContain('Restored')
    })
  })
})