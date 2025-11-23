import { Wiki, WikiFile } from '@prisma/client'

/**
 * Factory for creating Wiki and WikiFile test data
 */

let wikiCounter = 0

/**
 * Generate a unique slug for testing
 */
function generateUniqueSlug(prefix: string = 'test-wiki'): string {
  wikiCounter++
  return `${prefix}-${wikiCounter}-${Date.now()}`
}

/**
 * Create a Wiki factory function
 * 
 * @example
 * ```ts
 * const wiki = createWiki({ title: 'My Wiki', ownerId: 'user-123' })
 * ```
 */
export function createWiki(overrides: Partial<Wiki> = {}): Wiki {
  const now = new Date()
  const slug = overrides.slug || generateUniqueSlug()

  return {
    id: overrides.id || `wiki-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: overrides.title || 'Test Wiki',
    slug,
    description: overrides.description || 'A test wiki description',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ownerId: overrides.ownerId || 'test-owner-id',
    ...overrides,
  }
}

/**
 * Create multiple wikis
 */
export function createWikis(count: number, overrides: Partial<Wiki> = {}): Wiki[] {
  return Array.from({ length: count }, (_, index) =>
    createWiki({
      ...overrides,
      title: overrides.title || `Test Wiki ${index + 1}`,
      slug: overrides.slug || generateUniqueSlug(`wiki${index}`),
    })
  )
}

/**
 * Create a WikiFile factory function
 * 
 * @example
 * ```ts
 * const file = createWikiFile({ 
 *   wikiId: 'wiki-123', 
 *   filename: 'index.md',
 *   size: 1024 
 * })
 * ```
 */
export function createWikiFile(overrides: Partial<WikiFile> = {}): WikiFile {
  const now = new Date()
  const filename = overrides.filename || 'index.md'

  return {
    id: overrides.id || `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    wikiId: overrides.wikiId || 'test-wiki-id',
    filename,
    originalName: overrides.originalName || filename,
    size: overrides.size ?? 1024,
    url: overrides.url || `https://example.com/files/${filename}`,
    uploadedAt: overrides.uploadedAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
  }
}

/**
 * Create multiple wiki files
 */
export function createWikiFiles(
  count: number,
  overrides: Partial<WikiFile> = {}
): WikiFile[] {
  const defaultFilenames = [
    'index.md',
    'overview.md',
    'getting-started.md',
    'api-reference.md',
    'examples.md',
  ]

  return Array.from({ length: count }, (_, index) =>
    createWikiFile({
      ...overrides,
      filename: overrides.filename || defaultFilenames[index] || `file-${index}.md`,
      originalName:
        overrides.originalName || defaultFilenames[index] || `file-${index}.md`,
    })
  )
}

/**
 * Create a complete wiki with files
 */
export function createWikiWithFiles(
  wikiOverrides: Partial<Wiki> = {},
  fileOverrides: Partial<WikiFile> = {},
  fileCount: number = 3
): { wiki: Wiki; files: WikiFile[] } {
  const wiki = createWiki(wikiOverrides)
  const files = createWikiFiles(fileCount, {
    ...fileOverrides,
    wikiId: wiki.id,
  })

  return { wiki, files }
}

/**
 * Reset the wiki counter (useful for test isolation)
 */
export function resetWikiCounter(): void {
  wikiCounter = 0
}

