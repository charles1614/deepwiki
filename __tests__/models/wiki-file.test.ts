import { prisma } from '@/lib/database'

describe('WikiFile Model', () => {
  let testWiki: any

  beforeEach(async () => {
    // Clean up database
    await prisma.wikiFile.deleteMany()
    await prisma.wiki.deleteMany()

    // Create a test wiki for file testing
    testWiki = await prisma.wiki.create({
      data: {
        title: 'Test Wiki',
        slug: 'test-wiki',
        folderName: 'test-wiki-folder',
        description: 'A test wiki for file testing'
      }
    })
  })

  afterAll(async () => {
    // Clean up after all tests
    await prisma.wikiFile.deleteMany()
    await prisma.wiki.deleteMany()
    await prisma.$disconnect()
  })

  describe('Creating a WikiFile', () => {
    it('should create a wiki file with required fields', async () => {
      const wikiFile = await prisma.wikiFile.create({
        data: {
          wikiId: testWiki.id,
          fileName: 'index.md',
          filePath: 'test-wiki-folder/index.md',
          fileSize: 1024,
          contentType: 'text/markdown'
        }
      })

      expect(wikiFile).toBeDefined()
      expect(wikiFile.id).toBeDefined()
      expect(wikiFile.wikiId).toBe(testWiki.id)
      expect(wikiFile.fileName).toBe('index.md')
      expect(wikiFile.filePath).toBe('test-wiki-folder/index.md')
      expect(wikiFile.fileSize).toBe(1024)
      expect(wikiFile.contentType).toBe('text/markdown')
      expect(wikiFile.createdAt).toBeInstanceOf(Date)
    })

    it('should enforce unique filePath constraint', async () => {
      await prisma.wikiFile.create({
        data: {
          wikiId: testWiki.id,
          fileName: 'index.md',
          filePath: 'test-wiki-folder/index.md',
          fileSize: 1024,
          contentType: 'text/markdown'
        }
      })

      await expect(
        prisma.wikiFile.create({
          data: {
            wikiId: testWiki.id,
            fileName: 'index.md',
            filePath: 'test-wiki-folder/index.md', // Same path
            fileSize: 2048,
            contentType: 'text/markdown'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Wiki-WikiFile Relationship', () => {
    beforeEach(async () => {
      // Create test files for the wiki
      await prisma.wikiFile.createMany({
        data: [
          {
            wikiId: testWiki.id,
            fileName: 'index.md',
            filePath: 'test-wiki-folder/index.md',
            fileSize: 1024,
            contentType: 'text/markdown'
          },
          {
            wikiId: testWiki.id,
            fileName: 'overview.md',
            filePath: 'test-wiki-folder/overview.md',
            fileSize: 2048,
            contentType: 'text/markdown'
          },
          {
            wikiId: testWiki.id,
            fileName: 'guide.md',
            filePath: 'test-wiki-folder/guide.md',
            fileSize: 3072,
            contentType: 'text/markdown'
          }
        ]
      })
    })

    it('should retrieve all files for a wiki', async () => {
      const wikiWithFiles = await prisma.wiki.findUnique({
        where: { id: testWiki.id },
        include: { files: true }
      })

      expect(wikiWithFiles?.files).toHaveLength(3)
      expect(wikiWithFiles?.files.map(f => f.fileName)).toEqual(
        expect.arrayContaining(['index.md', 'overview.md', 'guide.md'])
      )
    })

    it('should retrieve files ordered by filename', async () => {
      const wikiWithFiles = await prisma.wiki.findUnique({
        where: { id: testWiki.id },
        include: {
          files: {
            orderBy: { fileName: 'asc' }
          }
        }
      })

      expect(wikiWithFiles?.files[0].fileName).toBe('guide.md')
      expect(wikiWithFiles?.files[1].fileName).toBe('index.md')
      expect(wikiWithFiles?.files[2].fileName).toBe('overview.md')
    })

    it('should filter files by content type', async () => {
      // Add a non-markdown file
      await prisma.wikiFile.create({
        data: {
          wikiId: testWiki.id,
          fileName: 'image.png',
          filePath: 'test-wiki-folder/image.png',
          fileSize: 4096,
          contentType: 'image/png'
        }
      })

      const markdownFiles = await prisma.wikiFile.findMany({
        where: {
          wikiId: testWiki.id,
          contentType: 'text/markdown'
        }
      })

      expect(markdownFiles).toHaveLength(3)
      expect(markdownFiles.every(f => f.fileName.endsWith('.md'))).toBe(true)
    })
  })

  describe('Querying WikiFiles', () => {
    let testFiles: any[]

    beforeEach(async () => {
      // Create test files
      testFiles = await prisma.wikiFile.createMany({
        data: [
          {
            wikiId: testWiki.id,
            fileName: 'index.md',
            filePath: 'test-wiki-folder/index.md',
            fileSize: 1024,
            contentType: 'text/markdown'
          },
          {
            wikiId: testWiki.id,
            fileName: 'readme.md',
            filePath: 'test-wiki-folder/readme.md',
            fileSize: 512,
            contentType: 'text/markdown'
          }
        ]
      })
    })

    it('should retrieve a file by path', async () => {
      const file = await prisma.wikiFile.findUnique({
        where: { filePath: 'test-wiki-folder/index.md' }
      })

      expect(file).toBeDefined()
      expect(file?.fileName).toBe('index.md')
      expect(file?.fileSize).toBe(1024)
    })

    it('should retrieve files for a specific wiki', async () => {
      const files = await prisma.wikiFile.findMany({
        where: { wikiId: testWiki.id }
      })

      expect(files).toHaveLength(2)
      expect(files.every(f => f.wikiId === testWiki.id)).toBe(true)
    })

    it('should calculate total file size for a wiki', async () => {
      const files = await prisma.wikiFile.findMany({
        where: { wikiId: testWiki.id }
      })

      const totalSize = files.reduce((sum, file) => sum + file.fileSize, 0)
      expect(totalSize).toBe(1536) // 1024 + 512
    })
  })

  describe('Cascade Delete Behavior', () => {
    it('should delete all files when wiki is deleted', async () => {
      // Create files
      await prisma.wikiFile.create({
        data: {
          wikiId: testWiki.id,
          fileName: 'index.md',
          filePath: 'test-wiki-folder/index.md',
          fileSize: 1024,
          contentType: 'text/markdown'
        }
      })

      // Verify file exists
      let fileCount = await prisma.wikiFile.count({
        where: { wikiId: testWiki.id }
      })
      expect(fileCount).toBe(1)

      // Delete the wiki
      await prisma.wiki.delete({
        where: { id: testWiki.id }
      })

      // Verify files are deleted
      fileCount = await prisma.wikiFile.count({
        where: { wikiId: testWiki.id }
      })
      expect(fileCount).toBe(0)
    })
  })
})