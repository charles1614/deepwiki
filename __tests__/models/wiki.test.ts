import { prisma } from '@/lib/database'

describe('Wiki Model', () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.wiki.deleteMany()
  })

  afterAll(async () => {
    // Clean up after all tests
    await prisma.wiki.deleteMany()
    await prisma.$disconnect()
  })

  describe('Creating a Wiki', () => {
    it('should create a wiki with required fields', async () => {
      const wiki = await prisma.wiki.create({
        data: {
          title: 'Test Wiki',
          slug: 'test-wiki',
          folderName: 'test-wiki-folder',
          description: 'A test wiki'
        }
      })

      expect(wiki).toBeDefined()
      expect(wiki.id).toBeDefined()
      expect(wiki.title).toBe('Test Wiki')
      expect(wiki.slug).toBe('test-wiki')
      expect(wiki.folderName).toBe('test-wiki-folder')
      expect(wiki.description).toBe('A test wiki')
      expect(wiki.createdAt).toBeInstanceOf(Date)
      expect(wiki.updatedAt).toBeInstanceOf(Date)
    })

    it('should create a wiki without optional description', async () => {
      const wiki = await prisma.wiki.create({
        data: {
          title: 'Simple Wiki',
          slug: 'simple-wiki',
          folderName: 'simple-wiki-folder'
        }
      })

      expect(wiki.description).toBeNull()
    })

    it('should enforce unique slug constraint', async () => {
      await prisma.wiki.create({
        data: {
          title: 'First Wiki',
          slug: 'duplicate-slug',
          folderName: 'first-folder'
        }
      })

      await expect(
        prisma.wiki.create({
          data: {
            title: 'Second Wiki',
            slug: 'duplicate-slug', // Same slug
            folderName: 'second-folder'
          }
        })
      ).rejects.toThrow()
    })

    it('should enforce unique folderName constraint', async () => {
      await prisma.wiki.create({
        data: {
          title: 'First Wiki',
          slug: 'first-slug',
          folderName: 'duplicate-folder'
        }
      })

      await expect(
        prisma.wiki.create({
          data: {
            title: 'Second Wiki',
            slug: 'second-slug',
            folderName: 'duplicate-folder' // Same folder name
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('Querying Wikis', () => {
    beforeEach(async () => {
      // Create test data
      await prisma.wiki.createMany({
        data: [
          {
            title: 'JavaScript Guide',
            slug: 'js-guide',
            folderName: 'js-guide-folder',
            description: 'Learn JavaScript'
          },
          {
            title: 'React Tutorial',
            slug: 'react-tutorial',
            folderName: 'react-tutorial-folder',
            description: 'Learn React'
          },
          {
            title: 'CSS Basics',
            slug: 'css-basics',
            folderName: 'css-basics-folder',
            description: 'Learn CSS'
          }
        ]
      })
    })

    it('should retrieve all wikis', async () => {
      const wikis = await prisma.wiki.findMany({
        orderBy: { title: 'asc' }
      })

      expect(wikis).toHaveLength(3)
      expect(wikis[0].title).toBe('CSS Basics')
      expect(wikis[1].title).toBe('JavaScript Guide')
      expect(wikis[2].title).toBe('React Tutorial')
    })

    it('should retrieve a wiki by slug', async () => {
      const wiki = await prisma.wiki.findUnique({
        where: { slug: 'js-guide' }
      })

      expect(wiki).toBeDefined()
      expect(wiki?.title).toBe('JavaScript Guide')
      expect(wiki?.description).toBe('Learn JavaScript')
    })

    it('should return null for non-existent slug', async () => {
      const wiki = await prisma.wiki.findUnique({
        where: { slug: 'non-existent' }
      })

      expect(wiki).toBeNull()
    })
  })

  describe('Updating a Wiki', () => {
    let wiki: any

    beforeEach(async () => {
      wiki = await prisma.wiki.create({
        data: {
          title: 'Original Title',
          slug: 'original-slug',
          folderName: 'original-folder',
          description: 'Original description'
        }
      })
    })

    it('should update wiki title and description', async () => {
      const updatedWiki = await prisma.wiki.update({
        where: { id: wiki.id },
        data: {
          title: 'Updated Title',
          description: 'Updated description'
        }
      })

      expect(updatedWiki.title).toBe('Updated Title')
      expect(updatedWiki.description).toBe('Updated description')
      expect(updatedWiki.slug).toBe('original-slug') // Unchanged
      expect(updatedWiki.updatedAt.getTime()).toBeGreaterThan(wiki.updatedAt.getTime())
    })
  })

  describe('Deleting a Wiki', () => {
    it('should delete a wiki', async () => {
      const wiki = await prisma.wiki.create({
        data: {
          title: 'To Delete',
          slug: 'to-delete',
          folderName: 'to-delete-folder'
        }
      })

      await prisma.wiki.delete({
        where: { id: wiki.id }
      })

      const deletedWiki = await prisma.wiki.findUnique({
        where: { id: wiki.id }
      })

      expect(deletedWiki).toBeNull()
    })
  })
})