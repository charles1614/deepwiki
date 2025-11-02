import { NextRequest, NextResponse } from 'next/server'
import { POST } from '@/app/api/wiki/upload/route'
import { prisma } from '@/lib/database'

// Mock R2StorageService
jest.mock('@/lib/storage/r2', () => ({
  R2StorageService: jest.fn().mockImplementation(() => ({
    uploadWikiFiles: jest.fn(),
    extractWikiTitle: jest.fn().mockReturnValue('Test Wiki Title'),
    generateWikiSlug: jest.fn().mockReturnValue('test-wiki')
  }))
}))

import { R2StorageService } from '@/lib/storage/r2'

describe('/api/wiki/upload', () => {
  let mockR2Service: jest.Mocked<R2StorageService>

  beforeEach(async () => {
    jest.clearAllMocks()

    // Create mock R2 service
    mockR2Service = new R2StorageService() as jest.Mocked<R2StorageService>
    ;(R2StorageService as jest.Mock).mockImplementation(() => mockR2Service)

    // Clean up database
    await prisma.wiki.deleteMany()
    await prisma.wikiFile.deleteMany()
  })

  afterAll(async () => {
    await prisma.wiki.deleteMany()
    await prisma.wikiFile.deleteMany()
    await prisma.$disconnect()
  })

  describe('POST /api/wiki/upload', () => {
    it('should successfully upload wiki files and create database records', async () => {
      // Mock successful upload
      mockR2Service.uploadWikiFiles.mockResolvedValue({
        success: true,
        uploadedFiles: ['test-wiki/index.md', 'test-wiki/overview.md']
      })

      // Mock title extraction
      mockR2Service.extractWikiTitle.mockReturnValue('Test Wiki Title')

      // Create mock files
      const files = [
        new File(['# Test Wiki\n\nContent'], 'index.md', { type: 'text/markdown' }),
        new File(['# Overview\n\nOverview content'], 'overview.md', { type: 'text/markdown' })
      ]

      // Create form data with files
      const formData = new FormData()
      formData.append('files', files[0])
      formData.append('files', files[1])

      // Create mock request
      const request = {
        formData: async () => formData,
        headers: {
          get: (name: string) => name === 'content-type' ? 'multipart/form-data; boundary=----' : null
        }
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response).toBeInstanceOf(NextResponse)
      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.wiki.slug).toBe('test-wiki')
      expect(data.wiki.title).toBe('Test Wiki Title')

      // Verify database records were created
      const wiki = await prisma.wiki.findUnique({
        where: { slug: 'test-wiki' }
      })
      expect(wiki).toBeDefined()
      expect(wiki?.title).toBe('Test Wiki Title')

      // Verify file records were created
      const fileRecords = await prisma.wikiFile.findMany({
        where: { wikiId: wiki?.id }
      })
      expect(fileRecords).toHaveLength(2)
    })

    it('should handle missing index.md file', async () => {
      const formData = new FormData()
      formData.append('files', new File(['# Overview'], 'overview.md', { type: 'text/markdown' }))

      const request = {
        formData: async () => formData,
        headers: {
          get: (name: string) => name === 'content-type' ? 'multipart/form-data; boundary=----' : null
        }
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('index.md file is required')
    })

    it('should handle non-markdown files', async () => {
      const formData = new FormData()
      formData.append('files', new File(['# Test Wiki'], 'index.md', { type: 'text/markdown' }))
      formData.append('files', new File(['fake image data'], 'image.png', { type: 'image/png' }))

      const request = {
        formData: async () => formData,
        headers: {
          get: (name: string) => name === 'content-type' ? 'multipart/form-data; boundary=----' : null
        }
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Only markdown (.md) files are allowed')
    })

    it('should handle R2 upload failure', async () => {
      const formData = new FormData()
      formData.append('files', new File(['# Test Wiki'], 'index.md', { type: 'text/markdown' }))

      // Mock R2 upload failure
      mockR2Service.uploadWikiFiles.mockResolvedValue({
        success: false,
        error: 'R2 upload failed'
      })

      const request = {
        formData: async () => formData,
        headers: {
          get: (name: string) => name === 'content-type' ? 'multipart/form-data; boundary=----' : null
        }
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('R2 upload failed')
    })

    it('should handle database errors', async () => {
      const formData = new FormData()
      formData.append('files', new File(['# Test Wiki'], 'index.md', { type: 'text/markdown' }))

      // Mock successful upload
      mockR2Service.uploadWikiFiles.mockResolvedValue({
        success: true,
        uploadedFiles: ['test-wiki/index.md']
      })

      // Mock database error
      const originalCreate = prisma.wiki.create
      prisma.wiki.create = jest.fn().mockRejectedValue(new Error('Database error'))

      const request = {
        formData: async () => formData,
        headers: {
          get: (name: string) => name === 'content-type' ? 'multipart/form-data; boundary=----' : null
        }
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to create wiki')

      // Restore original method
      prisma.wiki.create = originalCreate
    })

    it('should validate file upload size limits', async () => {
      // Create a very large file (over 10MB limit)
      const largeContent = '# Test Wiki\n'.repeat(1000000) // ~12MB
      const formData = new FormData()
      formData.append('files', new File([largeContent], 'index.md', { type: 'text/markdown' }))

      // Mock R2 service to prevent it from trying to connect to real R2
      mockR2Service.uploadWikiFiles.mockResolvedValue({
        success: true,
        uploadedFiles: ['test-wiki/index.md']
      })
      mockR2Service.extractWikiTitle.mockReturnValue('Test Wiki')
      mockR2Service.generateWikiSlug.mockReturnValue('test-wiki')

      const request = {
        formData: async () => formData,
        headers: {
          get: (name: string) => name === 'content-type' ? 'multipart/form-data; boundary=----' : null
        }
      } as unknown as NextRequest

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBe('File size too large')
    })
  })
})