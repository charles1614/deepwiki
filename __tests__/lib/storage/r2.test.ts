import { R2StorageService } from '@/lib/storage/r2'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Mock AWS S3 SDK
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
  ListObjectsV2Command: jest.fn()
}))

// Mock file-type
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn()
}))

// Mock gray-matter
jest.mock('gray-matter', () => ({
  default: jest.fn()
}))

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { fileTypeFromBuffer } from 'file-type'
import matter from 'gray-matter'

describe('R2StorageService', () => {
  let r2Service: R2StorageService
  let mockS3Client: jest.Mocked<any>
  let mockSend: jest.MockedFunction<any>

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()

    // Create mock S3 client
    mockSend = jest.fn()
    mockS3Client = {
      send: mockSend
    } as any

    // Mock S3Client constructor
    ;(S3Client as jest.Mock).mockImplementation(() => mockS3Client)

    // Create R2 service instance
    r2Service = new R2StorageService()

    // Set up default environment variables for testing
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key'
    process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
    process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account-id'
    process.env.CLOUDFLARE_R2_ENDPOINT_URL = 'https://test.r2.cloudflarestorage.com'
  })

  describe('initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(S3Client).toHaveBeenCalledWith({
        region: 'auto',
        endpoint: 'https://test.r2.cloudflarestorage.com',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key'
        }
      })
    })

    it('should throw error if required environment variables are missing', () => {
      delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID

      expect(() => new R2StorageService()).toThrow(
        'Missing required environment variables for R2 storage'
      )
    })
  })

  describe('uploadWikiFiles', () => {
    it('should upload multiple files to R2 with correct structure', async () => {
      const wikiSlug = 'test-wiki'
      const files = [
        {
          name: 'index.md',
          content: '# Test Wiki\n\nThis is a test wiki.',
          size: 31
        },
        {
          name: 'overview.md',
          content: '# Overview\n\nWiki overview content.',
          size: 35
        }
      ]

      // Mock successful uploads
      mockSend.mockResolvedValue({})

      // Mock file type detection
      ;(fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        ext: 'md',
        mime: 'text/markdown'
      })

      const result = await r2Service.uploadWikiFiles(wikiSlug, files)

      expect(result).toEqual({
        success: true,
        uploadedFiles: [
          'test-wiki/index.md',
          'test-wiki/overview.md'
        ]
      })

      // Verify S3 client was called correctly
      expect(mockSend).toHaveBeenCalledTimes(2)
      expect(PutObjectCommand).toHaveBeenCalledTimes(2)

      // Check first upload call (index.md)
      const firstCall = (PutObjectCommand as jest.Mock).mock.calls[0][0]
      expect(firstCall).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'test-wiki/index.md',
        ContentType: 'text/markdown',
        Body: Buffer.from(files[0].content)
      })

      // Check second upload call (overview.md)
      const secondCall = (PutObjectCommand as jest.Mock).mock.calls[1][0]
      expect(secondCall).toMatchObject({
        Bucket: 'test-bucket',
        Key: 'test-wiki/overview.md',
        ContentType: 'text/markdown',
        Body: Buffer.from(files[1].content)
      })
    })

    it('should handle upload errors gracefully', async () => {
      const wikiSlug = 'test-wiki'
      const files = [{ name: 'index.md', content: '# Test', size: 7 }]

      // Mock upload failure
      mockSend.mockRejectedValue(new Error('Upload failed'))

      // Mock file type detection
      ;(fileTypeFromBuffer as jest.Mock).mockResolvedValue({
        ext: 'md',
        mime: 'text/markdown'
      })

      const result = await r2Service.uploadWikiFiles(wikiSlug, files)

      expect(result).toEqual({
        success: false,
        error: 'Upload failed'
      })
    })

    it('should validate that index.md is included', async () => {
      const wikiSlug = 'test-wiki'
      const files = [
        { name: 'overview.md', content: '# Overview', size: 11 }
      ]

      const result = await r2Service.uploadWikiFiles(wikiSlug, files)

      expect(result).toEqual({
        success: false,
        error: 'index.md file is required'
      })
    })

    it('should validate file types (markdown only)', async () => {
      const wikiSlug = 'test-wiki'
      const files = [
        { name: 'index.md', content: '# Test', size: 7 },
        { name: 'image.png', content: 'fake-image-data', size: 14 }
      ]

      // Mock file type detection for non-markdown file
      ;(fileTypeFromBuffer as jest.Mock).mockResolvedValueOnce({
        ext: 'md',
        mime: 'text/markdown'
      }).mockResolvedValueOnce({
        ext: 'png',
        mime: 'image/png'
      })

      const result = await r2Service.uploadWikiFiles(wikiSlug, files)

      expect(result).toEqual({
        success: false,
        error: 'Only markdown (.md) files are allowed'
      })
    })
  })

  describe('getWikiFile', () => {
    it('should retrieve file content from R2', async () => {
      const wikiSlug = 'test-wiki'
      const fileName = 'index.md'
      const fileContent = '# Test Wiki Content'

      // Mock successful file retrieval
      const mockStream = {
        transformToByteArray: jest.fn().mockResolvedValue(Buffer.from(fileContent))
      }
      mockSend.mockResolvedValue({ Body: mockStream })

      const result = await r2Service.getWikiFile(wikiSlug, fileName)

      expect(result).toEqual({
        success: true,
        content: fileContent
      })

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'test-wiki/index.md'
      })
    })

    it('should handle file not found', async () => {
      const wikiSlug = 'test-wiki'
      const fileName = 'nonexistent.md'

      // Mock file not found error
      mockSend.mockRejectedValue(new Error('NotFound'))

      const result = await r2Service.getWikiFile(wikiSlug, fileName)

      expect(result).toEqual({
        success: false,
        error: 'File not found'
      })
    })
  })

  describe('listWikiFiles', () => {
    it('should list all files for a wiki', async () => {
      const wikiSlug = 'test-wiki'

      // Mock successful list operation
      mockSend.mockResolvedValue({
        Contents: [
          { Key: 'test-wiki/index.md', Size: 100, LastModified: new Date() },
          { Key: 'test-wiki/overview.md', Size: 200, LastModified: new Date() },
          { Key: 'test-wiki/guide.md', Size: 150, LastModified: new Date() }
        ]
      })

      const result = await r2Service.listWikiFiles(wikiSlug)

      expect(result).toEqual({
        success: true,
        files: [
          { name: 'index.md', size: 100 },
          { name: 'overview.md', size: 200 },
          { name: 'guide.md', size: 150 }
        ]
      })

      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Prefix: 'test-wiki/'
      })
    })

    it('should handle empty wiki', async () => {
      const wikiSlug = 'empty-wiki'

      // Mock empty list
      mockSend.mockResolvedValue({
        Contents: []
      })

      const result = await r2Service.listWikiFiles(wikiSlug)

      expect(result).toEqual({
        success: true,
        files: []
      })
    })
  })

  describe('deleteWiki', () => {
    it('should delete all files for a wiki', async () => {
      const wikiSlug = 'test-wiki'

      // Mock list files
      mockSend.mockResolvedValueOnce({
        Contents: [
          { Key: 'test-wiki/index.md' },
          { Key: 'test-wiki/overview.md' }
        ]
      })

      // Mock successful deletions
      mockSend.mockResolvedValue({})

      const result = await r2Service.deleteWiki(wikiSlug)

      expect(result).toEqual({
        success: true,
        deletedFiles: ['test-wiki/index.md', 'test-wiki/overview.md']
      })

      // Should have called list + 2 deletes
      expect(mockSend).toHaveBeenCalledTimes(3)
      expect(DeleteObjectCommand).toHaveBeenCalledTimes(2)
    })
  })

  describe('extractWikiTitle', () => {
    it('should extract title from index.md content', async () => {
      const markdownContent = '# My Awesome Wiki\n\nThis is the content.'

      // Mock gray-matter to return title
      ;(matter as jest.Mock).mockReturnValue({
        data: { title: 'My Awesome Wiki' },
        content: markdownContent
      })

      const title = r2Service.extractWikiTitle(markdownContent)

      expect(title).toBe('My Awesome Wiki')
      expect(matter).toHaveBeenCalledWith(markdownContent)
    })

    it('should use default title when no title in frontmatter', async () => {
      const markdownContent = '# Default Title\n\nThis is the content.'

      // Mock gray-matter to return empty data
      ;(matter as jest.Mock).mockReturnValue({
        data: {},
        content: markdownContent
      })

      const title = r2Service.extractWikiTitle(markdownContent)

      expect(title).toBe('Default Title')
    })

    it('should use filename as fallback title', async () => {
      const markdownContent = 'Just some content without title.'

      // Mock gray-matter to return empty data and no h1
      ;(matter as jest.Mock).mockReturnValue({
        data: {},
        content: markdownContent
      })

      const title = r2Service.extractWikiTitle(markdownContent, 'my-wiki.md')

      expect(title).toBe('My Wiki')
    })
  })
})