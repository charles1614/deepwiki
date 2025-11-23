import { WikiVersion } from '@prisma/client'
import crypto from 'crypto'

/**
 * Factory for creating WikiVersion test data
 */

let versionCounter = 0

/**
 * Generate a checksum for content
 */
function generateChecksum(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

/**
 * Create a WikiVersion factory function
 * 
 * @example
 * ```ts
 * const version = createWikiVersion({ 
 *   fileId: 'file-123', 
 *   content: '# Hello World',
 *   authorId: 'user-123' 
 * })
 * ```
 */
export function createWikiVersion(overrides: Partial<WikiVersion> = {}): WikiVersion {
  const now = new Date()
  const content = overrides.content || '# Test Content\n\nThis is test content.'
  const contentSize = overrides.contentSize ?? Buffer.byteLength(content, 'utf8')
  const checksum = overrides.checksum || generateChecksum(content)

  versionCounter++

  return {
    id: overrides.id || `version-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    fileId: overrides.fileId || 'test-file-id',
    versionNumber: overrides.versionNumber ?? versionCounter,
    content,
    changeType: overrides.changeType || 'UPDATE',
    changeDescription: overrides.changeDescription || null,
    authorId: overrides.authorId || 'test-author-id',
    contentSize,
    checksum,
    createdAt: overrides.createdAt || now,
    ...overrides,
  }
}

/**
 * Create multiple versions for a file
 */
export function createWikiVersions(
  count: number,
  overrides: Partial<WikiVersion> = {}
): WikiVersion[] {
  versionCounter = 0 // Reset counter for this batch

  return Array.from({ length: count }, (_, index) => {
    const baseContent = `# Version ${index + 1}\n\nContent for version ${index + 1}.`
    return createWikiVersion({
      ...overrides,
      versionNumber: index + 1,
      content: overrides.content || baseContent,
      changeType: index === 0 ? 'CREATE' : 'UPDATE',
      changeDescription:
        overrides.changeDescription || `Version ${index + 1} changes`,
    })
  })
}

/**
 * Create a version history (multiple versions with incremental changes)
 */
export function createVersionHistory(
  fileId: string,
  authorId: string,
  count: number = 3
): WikiVersion[] {
  versionCounter = 0

  return Array.from({ length: count }, (_, index) => {
    const content = `# Document\n\nVersion ${index + 1} content.\n\n${'Updated '.repeat(index)}`
    return createWikiVersion({
      fileId,
      authorId,
      versionNumber: index + 1,
      content,
      changeType: index === 0 ? 'CREATE' : 'UPDATE',
      changeDescription: index === 0 ? 'Initial version' : `Updated to version ${index + 1}`,
    })
  })
}

/**
 * Create a rollback version (version that restores previous content)
 */
export function createRollbackVersion(
  fileId: string,
  authorId: string,
  targetVersionNumber: number,
  currentVersionNumber: number
): WikiVersion {
  versionCounter = currentVersionNumber + 1

  return createWikiVersion({
    fileId,
    authorId,
    versionNumber: currentVersionNumber + 1,
    content: `# Rolled back to version ${targetVersionNumber}`,
    changeType: 'ROLLBACK',
    changeDescription: `Rolled back to version ${targetVersionNumber}`,
  })
}

/**
 * Reset the version counter (useful for test isolation)
 */
export function resetVersionCounter(): void {
  versionCounter = 0
}

