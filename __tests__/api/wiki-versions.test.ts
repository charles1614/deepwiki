import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// Test marker to identify test data
const TEST_MARKER = '[TEST]'

// Mock NextAuth for API tests
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com'
    }
  }))
}))

// Mock authOptions
jest.mock('@/lib/auth', () => ({
  authOptions: {}
}))

describe('Wiki Versions API', () => {
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

  describe('GET /api/wiki/[wikiId]/versions', () => {
    it('should return all versions for a wiki', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions`)

      // Mock the GET handler
      const { GET } = require('@/app/api/wiki/[wikiId]/versions/route')
      const response = await GET(request, { params: { wikiId: testWiki.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.versions).toHaveLength(3)

      // Versions should be ordered by version descending (latest first)
      expect(data.versions[0].version).toBe(3)
      expect(data.versions[1].version).toBe(2)
      expect(data.versions[2].version).toBe(1)
    })

    it('should return empty array for wiki with no versions', async () => {
      // Create wiki with no versions
      const emptyWiki = await prisma.wiki.create({
        data: {
          title: `${TEST_MARKER} Empty Wiki`,
          slug: 'empty-wiki',
          folderName: 'empty-wiki',
          description: 'Wiki with no versions'
        }
      })

      const request = new NextRequest(`http://localhost:3000/api/wiki/${emptyWiki.id}/versions`)

      const { GET } = require('@/app/api/wiki/[wikiId]/versions/route')
      const response = await GET(request, { params: { wikiId: emptyWiki.id } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.versions).toHaveLength(0)

      // Clean up
      await prisma.wiki.delete({ where: { id: emptyWiki.id } })
    })

    it('should return 404 for non-existent wiki', async () => {
      const request = new NextRequest('http://localhost:3000/api/wiki/non-existent-id/versions')

      const { GET } = require('@/app/api/wiki/[wikiId]/versions/route')
      const response = await GET(request, { params: { wikiId: 'non-existent-id' } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Wiki not found')
    })
  })

  describe('GET /api/wiki/[wikiId]/versions/[version]', () => {
    it('should return a specific version', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions/2`)

      const { GET } = require('@/app/api/wiki/[wikiId]/versions/[version]/route')
      const response = await GET(request, {
        params: { wikiId: testWiki.id, version: '2' }
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.version.version).toBe(2)
      expect(data.version.content).toContain('Updated content')
      expect(data.version.changeLog).toBe('Added new section')
    })

    it('should return 404 for non-existent version', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions/999`)

      const { GET } = require('@/app/api/wiki/[wikiId]/versions/[version]/route')
      const response = await GET(request, {
        params: { wikiId: testWiki.id, version: '999' }
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Version not found')
    })
  })

  describe('POST /api/wiki/[wikiId]/versions', () => {
    it('should create a new version', async () => {
      const newVersionData = {
        content: '# Version 4\n\nNew version content created via API.',
        changeLog: 'Created via API test'
      }

      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions`, {
        method: 'POST',
        body: JSON.stringify(newVersionData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Mock user session (you'll need to implement authentication)
      const mockUser = { id: testUser.id, email: testUser.email }

      const { POST } = require('@/app/api/wiki/[wikiId]/versions/route')
      const response = await POST(request, {
        params: { wikiId: testWiki.id },
        // Mock session would go here in real implementation
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.version.version).toBe(4)
      expect(data.version.content).toBe(newVersionData.content)
      expect(data.version.changeLog).toBe(newVersionData.changeLog)
    })

    it('should auto-increment version number', async () => {
      const newVersionData = {
        content: '# Version 5\n\nAnother version.',
        changeLog: 'Auto-increment test'
      }

      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions`, {
        method: 'POST',
        body: JSON.stringify(newVersionData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { POST } = require('@/app/api/wiki/[wikiId]/versions/route')
      const response = await POST(request, {
        params: { wikiId: testWiki.id }
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.version.version).toBe(5) // Should be 5 (1-3 already exist, we created 4 in previous test)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        changeLog: 'Missing content field'
      }

      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions`, {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { POST } = require('@/app/api/wiki/[wikiId]/versions/route')
      const response = await POST(request, {
        params: { wikiId: testWiki.id }
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Content is required')
    })
  })

  describe('POST /api/wiki/[wikiId]/versions/[version]/restore', () => {
    it('should restore a wiki to a previous version', async () => {
      // Restore to version 2
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions/2/restore`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { POST } = require('@/app/api/wiki/[wikiId]/versions/[version]/restore/route')
      const response = await POST(request, {
        params: { wikiId: testWiki.id, version: '2' }
      })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.version.version).toBe(4) // New version created with restored content
      expect(data.version.content).toBe(testVersions[1].content) // Content from version 2
      expect(data.version.changeLog).toContain('Restored to version 2')
    })

    it('should validate that version exists before restoring', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions/999/restore`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const { POST } = require('@/app/api/wiki/[wikiId]/versions/[version]/restore/route')
      const response = await POST(request, {
        params: { wikiId: testWiki.id, version: '999' }
      })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Version not found')
    })
  })

  describe('GET /api/wiki/[wikiId]/versions/[version]/compare/[targetVersion]', () => {
    it('should compare two versions and return differences', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions/1/compare/3`)

      const { GET } = require('@/app/api/wiki/[wikiId]/versions/[version]/compare/[targetVersion]/route')
      const response = await GET(request, {
        params: {
          wikiId: testWiki.id,
          version: '1',
          targetVersion: '3'
        }
      })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.comparison).toBeDefined()
      expect(data.comparison.fromVersion).toBe(1)
      expect(data.comparison.toVersion).toBe(3)
      expect(data.comparison.differences).toBeDefined()

      // Should detect differences in content
      expect(data.comparison.differences.length).toBeGreaterThan(0)
    })

    it('should return error when comparing same version', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wiki/${testWiki.id}/versions/2/compare/2`)

      const { GET } = require('@/app/api/wiki/[wikiId]/versions/[version]/compare/[targetVersion]/route')
      const response = await GET(request, {
        params: {
          wikiId: testWiki.id,
          version: '2',
          targetVersion: '2'
        }
      })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Cannot compare same version')
    })
  })
})