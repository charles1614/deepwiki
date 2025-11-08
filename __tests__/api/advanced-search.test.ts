import { prisma } from '@/lib/database'

// Test marker to identify test data
const TEST_MARKER = '[ADVANCED_SEARCH_TEST]'

describe('Advanced Search Database Operations', () => {
  let testUser: any
  let testWikis: any[]
  let testFiles: any[]

  beforeEach(async () => {
    // Clean up test data
    await prisma.wikiFile.deleteMany({
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
        email: { startsWith: 'advanced-search-test' }
      }
    })

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'advanced-search-test@example.com',
        password: 'hashedpassword',
        role: 'USER'
      }
    })

    // Create test wikis with different content
    testWikis = await Promise.all([
      prisma.wiki.create({
        data: {
          title: `${TEST_MARKER} React Development Guide`,
          slug: 'react-development-guide',
          folderName: 'react-development-guide',
          description: 'Comprehensive guide to React development with hooks and components'
        }
      }),
      prisma.wiki.create({
        data: {
          title: `${TEST_MARKER} TypeScript Best Practices`,
          slug: 'typescript-best-practices',
          folderName: 'typescript-best-practices',
          description: 'Best practices for TypeScript development in modern applications'
        }
      }),
      prisma.wiki.create({
        data: {
          title: `${TEST_MARKER} Database Design Patterns`,
          slug: 'database-design-patterns',
          folderName: 'database-design-patterns',
          description: 'Common database design patterns and normalization techniques'
        }
      })
    ])

    // Create test files with searchable content
    testFiles = await Promise.all([
      // React files
      prisma.wikiFile.create({
        data: {
          wikiId: testWikis[0].id,
          fileName: 'index.md',
          filePath: 'index.md',
          content: '# React Development Guide\n\nReact is a JavaScript library for building user interfaces. This guide covers hooks, components, and state management.\n\n## useState Hook\n\nThe useState hook allows you to add state to functional components.\n\n```javascript\nconst [count, setCount] = useState(0)\n```\n\n## useEffect Hook\n\nThe useEffect hook lets you perform side effects in functional components.',
          fileSize: 1024,
          contentType: 'text/markdown'
        }
      }),
      prisma.wikiFile.create({
        data: {
          wikiId: testWikis[0].id,
          fileName: 'components.md',
          filePath: 'components.md',
          content: '# React Components\n\nComponents are the building blocks of React applications. They can be functional or class-based.\n\n## Functional Components\n\nFunctional components are JavaScript functions that return JSX.',
          fileSize: 512,
          contentType: 'text/markdown'
        }
      }),
      // TypeScript files
      prisma.wikiFile.create({
        data: {
          wikiId: testWikis[1].id,
          fileName: 'types.md',
          filePath: 'types.md',
          content: '# TypeScript Types\n\nTypeScript provides static typing for JavaScript. This includes interfaces, generics, and type inference.\n\n## Interfaces\n\nInterfaces define the structure of objects.',
          fileSize: 768,
          contentType: 'text/markdown'
        }
      }),
      // Database files
      prisma.wikiFile.create({
        data: {
          wikiId: testWikis[2].id,
          fileName: 'normalization.md',
          filePath: 'normalization.md',
          content: '# Database Normalization\n\nNormalization is the process of organizing data in a database. This includes first, second, and third normal forms.',
          fileSize: 896,
          contentType: 'text/markdown'
        }
      })
    ])
  })

  afterEach(async () => {
    // Clean up test data
    await prisma.wikiFile.deleteMany({
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
        email: { startsWith: 'advanced-search-test' }
      }
    })
  })

  describe('Content Search Database Operations', () => {
    it('should find files by content search', async () => {
      const files = await prisma.wikiFile.findMany({
        where: {
          content: {
            contains: 'useState'
          }
        },
        include: {
          wiki: true
        }
      })

      expect(files.length).toBeGreaterThan(0)
      expect(files[0].wiki.title).toContain('React Development Guide')
      expect(files[0].content).toContain('useState')
    })

    it('should find files with exact phrase matching', async () => {
      const files = await prisma.wikiFile.findMany({
        where: {
          content: {
            contains: 'functional components'
          }
        },
        include: {
          wiki: true
        }
      })

      expect(files.length).toBeGreaterThan(0)
      expect(files[0].content).toContain('functional components')
    })

    it('should filter by content type', async () => {
      const markdownFiles = await prisma.wikiFile.findMany({
        where: {
          contentType: 'text/markdown',
          content: {
            contains: 'guide'
          }
        }
      })

      expect(markdownFiles.length).toBeGreaterThan(0)
      markdownFiles.forEach(file => {
        expect(file.contentType).toBe('text/markdown')
      })
    })

    it('should exclude terms from search results', async () => {
      // Find files containing 'React' but not 'database'
      const reactFiles = await prisma.wikiFile.findMany({
        where: {
          AND: [
            { content: { contains: 'React' } },
            { NOT: { content: { contains: 'database' } } }
          ]
        }
      })

      expect(reactFiles.length).toBeGreaterThan(0)
      reactFiles.forEach(file => {
        expect(file.content.toLowerCase()).toContain('react')
        expect(file.content.toLowerCase()).not.toContain('database')
      })
    })
  })

  describe('Search Result Grouping', () => {
    it('should group search results by wiki', async () => {
      const files = await prisma.wikiFile.findMany({
        where: {
          wiki: {
            title: { startsWith: TEST_MARKER }
          }
        },
        include: {
          wiki: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          }
        }
      })

      // Group files by wiki
      const wikiGroups = files.reduce((acc, file) => {
        const wikiId = file.wikiId
        if (!acc[wikiId]) {
          acc[wikiId] = {
            wiki: file.wiki,
            files: []
          }
        }
        acc[wikiId].files.push(file)
        return acc
      }, {} as any)

      expect(Object.keys(wikiGroups)).toHaveLength(3) // 3 wikis
      expect(wikiGroups[testWikis[0].id].files).toHaveLength(2) // React guide has 2 files
    })

    it('should create proper search result structure', async () => {
      const files = await prisma.wikiFile.findMany({
        where: {
          content: {
            contains: 'React'
          }
        },
        include: {
          wiki: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      })

      expect(files.length).toBeGreaterThan(0)

      // Test that we can create the expected search result structure
      const searchResult = {
        wiki: files[0].wiki,
        matches: files.map(file => ({
          file: {
            id: file.id,
            fileName: file.fileName,
            filePath: file.filePath,
            contentType: file.contentType
          },
          content: file.content
        }))
      }

      expect(searchResult.wiki).toBeDefined()
      expect(searchResult.matches).toBeDefined()
      expect(searchResult.matches.length).toBeGreaterThan(0)
    })
  })
})