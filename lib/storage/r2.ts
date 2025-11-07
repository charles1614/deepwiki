import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import matter from 'gray-matter'
import slugify from 'slugify'

// Dynamic import for file-type to avoid Jest resolution issues
const fileTypeFromBuffer = async (buffer: Buffer) => {
  const { fileTypeFromBuffer } = await import('file-type')
  return fileTypeFromBuffer(buffer)
}

export interface WikiFile {
  name: string
  content: string
  size: number
}

export interface UploadResult {
  success: boolean
  uploadedFiles?: string[]
  error?: string
}

export interface GetFileResult {
  success: boolean
  content?: string
  error?: string
}

export interface ListFilesResult {
  success: boolean
  files?: { name: string; size: number }[]
  error?: string
}

export interface DeleteWikiResult {
  success: boolean
  deletedFiles?: string[]
  error?: string
}

export class R2StorageService {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    // Validate required environment variables
    const requiredEnvVars = [
      'CLOUDFLARE_R2_ACCESS_KEY_ID',
      'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
      'CLOUDFLARE_R2_BUCKET_NAME',
      'CLOUDFLARE_R2_ACCOUNT_ID',
      'CLOUDFLARE_R2_ENDPOINT_URL'
    ]

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
    if (missingVars.length > 0) {
      throw new Error('Missing required environment variables for R2 storage')
    }

    // Initialize S3 client for R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT_URL,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!
      }
    })

    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME!
  }

  /**
   * Upload multiple files for a wiki to R2 storage
   */
  async uploadWikiFiles(wikiSlug: string, files: WikiFile[]): Promise<UploadResult> {
    try {
      // Validate that index.md is included
      const hasIndexMd = files.some(file => file.name === 'index.md')
      if (!hasIndexMd) {
        return { success: false, error: 'index.md file is required' }
      }

      // Validate file types (only markdown files)
      for (const file of files) {
        if (!file.name.endsWith('.md')) {
          return { success: false, error: 'Only markdown (.md) files are allowed' }
        }
      }

      const uploadedFiles: string[] = []

      for (const file of files) {
        // Validate and ensure UTF-8 encoding for file content
        let contentBuffer: Buffer
        try {
          // Validate content is valid UTF-8
          const encoder = new TextEncoder()
          const decoder = new TextDecoder('utf-8', { fatal: true })
          const validatedContent = decoder.decode(encoder.encode(file.content))
          contentBuffer = Buffer.from(validatedContent, 'utf-8')
        } catch (encodingError) {
          console.warn('Invalid UTF-8 in file content, cleaning:', file.name, encodingError)
          // Clean the content and ensure valid UTF-8
          const cleanedContent = file.content
            .replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, '')
            .replace(/[\uFEFF]/g, '') // Remove BOM
          const encoder = new TextEncoder()
          contentBuffer = Buffer.from(encoder.encode(cleanedContent))
        }

        // For markdown files, use proper content-type with encoding
        const mimeType = 'text/markdown; charset=utf-8'
        const key = `${wikiSlug}/${file.name}`

        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: contentBuffer,
          ContentType: mimeType,
          Metadata: {
            encoding: 'utf-8'
          }
        })

        await this.s3Client.send(command)
        uploadedFiles.push(key)
      }

      return { success: true, uploadedFiles }
    } catch (error) {
      console.error('Error uploading wiki files:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during upload'
      }
    }
  }

  /**
   * Get a specific file content from R2 storage
   */
  async getWikiFile(wikiSlug: string, fileName: string): Promise<GetFileResult> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: `${wikiSlug}/${fileName}`
      })

      const response = await this.s3Client.send(command)

      if (!response.Body) {
        return { success: false, error: 'File not found' }
      }

      // Convert stream to string with proper UTF-8 validation
      const chunks = []
      const stream = response.Body as any
      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      // Validate UTF-8 encoding before converting
      const buffer = Buffer.concat(chunks)
      let content: string

      try {
        // Check if buffer is valid UTF-8
        const decoder = new TextDecoder('utf-8', { fatal: true })
        content = decoder.decode(buffer)
      } catch (encodingError) {
        console.warn('Invalid UTF-8 detected, attempting to clean:', encodingError)
        // Fallback: clean the buffer and try non-fatal decoding
        const decoder = new TextDecoder('utf-8', { fatal: false })
        content = decoder.decode(buffer).replace(/[\uFFFD\u0000-\u001F\u007F-\u009F]/g, '')
      }

      return { success: true, content }
    } catch (error) {
      console.error('Error getting wiki file:', error)
      if (error instanceof Error && error.message.includes('NoSuchKey')) {
        return { success: false, error: 'File not found' }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting file'
      }
    }
  }

  /**
   * List all files for a wiki
   */
  async listWikiFiles(wikiSlug: string): Promise<ListFilesResult> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: `${wikiSlug}/`
      })

      const response = await this.s3Client.send(command)

      const files = (response.Contents || []).map(obj => ({
        name: obj.Key!.replace(`${wikiSlug}/`, ''),
        size: obj.Size || 0
      }))

      return { success: true, files }
    } catch (error) {
      console.error('Error listing wiki files:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error listing files'
      }
    }
  }

  /**
   * Delete all files for a wiki
   */
  async deleteWiki(wikiSlug: string): Promise<DeleteWikiResult> {
    try {
      // First, list all files for the wiki
      const listResult = await this.listWikiFiles(wikiSlug)
      if (!listResult.success || !listResult.files) {
        return { success: false, error: 'Failed to list files for deletion' }
      }

      const deletedFiles: string[] = []

      // Delete each file
      for (const file of listResult.files) {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: `${wikiSlug}/${file.name}`
        })

        await this.s3Client.send(command)
        deletedFiles.push(`${wikiSlug}/${file.name}`)
      }

      return { success: true, deletedFiles }
    } catch (error) {
      console.error('Error deleting wiki:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting wiki'
      }
    }
  }

  /**
   * Extract title from markdown content
   */
  extractWikiTitle(markdownContent: string, fileName?: string): string {
    try {
      // Try to get title from frontmatter
      const { data } = matter(markdownContent)
      if (data.title) {
        return data.title
      }

      // Try to get title from first H1 heading
      const h1Match = markdownContent.match(/^# (.+)$/m)
      if (h1Match) {
        return h1Match[1].trim()
      }

      // Fallback to filename if provided
      if (fileName) {
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
        return nameWithoutExt
          .split(/[-_]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      // Final fallback
      return 'Untitled Wiki'
    } catch (error) {
      console.error('Error extracting wiki title:', error)
      return 'Untitled Wiki'
    }
  }

  /**
   * Generate wiki slug from title
   */
  generateWikiSlug(title: string): string {
    return slugify(title, {
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    })
  }
}