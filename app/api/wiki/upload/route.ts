import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'
import slugify from 'slugify'
import matter from 'gray-matter'

// Helper function to sanitize filenames and prevent path traversal
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/\.\./g, '')     // Remove ..
    .replace(/\//g, '-')       // Replace / with -
    .replace(/\\/g, '-')       // Replace \ with -
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Remove special chars
}

// Helper function to get unique image name if duplicate exists
function getUniqueImageName(
  originalName: string,
  existingNames: Set<string>
): string {
  const sanitized = sanitizeFilename(originalName)
  let name = sanitized
  let counter = 1

  while (existingNames.has(name)) {
    const ext = sanitized.split('.').pop()
    const base = sanitized.replace(/\.[^.]+$/, '')
    name = `${base}-${counter}.${ext}`
    counter++
  }

  return name
}

// Helper function to resolve image path from markdown reference to R2 URL
function resolveImagePath(
  imagePath: string,
  uploadedImageMap: Map<string, string>,
  availableImages: string[]
): string | null {
  // Skip external URLs
  if (/^https?:\/\//i.test(imagePath)) {
    return null
  }

  // Normalize path (remove ./, ../, leading /)
  const normalizedPath = imagePath
    .replace(/^\.+\//g, '') // Remove any leading ./ or ../
    .replace(/^\//, '') // Remove leading /

  // Extract filename from path
  const filename = normalizedPath.split('/').pop() || ''

  // Strategy 1: Exact match
  if (uploadedImageMap.has(filename)) {
    return uploadedImageMap.get(filename)!
  }

  // Strategy 2: Case-insensitive match
  const lowerFilename = filename.toLowerCase()
  for (const [key, url] of Array.from(uploadedImageMap.entries())) {
    if (key.toLowerCase() === lowerFilename) {
      return url
    }
  }

  // Strategy 3: Match any available image with same base name (without extension)
  const baseWithoutExt = filename.replace(/\.[^.]+$/, '').toLowerCase()
  for (const availableImage of availableImages) {
    const availableBase = availableImage.replace(/\.[^.]+$/, '').toLowerCase()
    if (baseWithoutExt === availableBase && uploadedImageMap.has(availableImage)) {
      return uploadedImageMap.get(availableImage) || null
    }
  }

  // Not found - log warning but don't fail
  console.warn(`Image not found in upload: ${imagePath}`)
  return null
}

// Helper function to replace image paths in markdown content
function replaceImagePaths(
  markdown: string,
  uploadedImageMap: Map<string, string>,
  availableImages: string[]
): string {
  let processedMarkdown = markdown

  // Pattern 1: Standard markdown images ![alt](path)
  const standardPattern = /!\[([^\]]*)\]\(([^)]+)\)/g
  processedMarkdown = processedMarkdown.replace(
    standardPattern,
    (match, alt, imagePath) => {
      const r2Url = resolveImagePath(imagePath, uploadedImageMap, availableImages)
      return r2Url ? `![${alt}](${r2Url})` : match
    }
  )

  // Pattern 2: HTML img tags <img src="path" />
  const htmlPattern = /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi
  processedMarkdown = processedMarkdown.replace(
    htmlPattern,
    (match, imagePath) => {
      const r2Url = resolveImagePath(imagePath, uploadedImageMap, availableImages)
      if (!r2Url) return match

      // Replace src attribute with R2 URL
      return match.replace(
        /src=["']([^"']+)["']/i,
        `src="${r2Url}"`
      )
    }
  )

  return processedMarkdown
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Categorize files into markdown and images
    const markdownFiles = files.filter(f => f.name.endsWith('.md'))
    const imageFiles = files.filter(f =>
      /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(f.name)
    )

    // Find index.md to determine wiki properties
    const indexFile = markdownFiles.find(f => f.name === 'index.md')
    if (!indexFile) {
      return NextResponse.json({ error: 'index.md is required' }, { status: 400 })
    }

    const indexContent = await indexFile.text()
    const { data: frontmatter, content } = matter(indexContent)

    let title = frontmatter.title
    if (!title) {
      // Try to find first H1
      const h1Match = content.match(/^#\s+(.+)$/m)
      if (h1Match) {
        title = h1Match[1].trim()
      }
    }

    if (!title) {
      title = 'Untitled Wiki'
    }

    const slug = frontmatter.slug || slugify(title, { lower: true, strict: true })
    const description = frontmatter.description || ''

    // Create or update Wiki
    let wiki = await prisma.wiki.findUnique({ where: { slug } })

    if (wiki) {
      if (wiki.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
      wiki = await prisma.wiki.update({
        where: { id: wiki.id },
        data: { title, description, updatedAt: new Date() }
      })
    } else {
      try {
        wiki = await prisma.wiki.create({
          data: {
            slug,
            title,
            description,
            ownerId: session.user.id,
            isPublic: true
          }
        })
      } catch (e) {
        return NextResponse.json({ error: 'Wiki slug already exists' }, { status: 409 })
      }
    }

    const r2Service = new R2StorageService()
    const results = []

    // Upload images first and build mapping for path resolution
    const uploadedImageMap = new Map<string, string>() // original filename -> R2 URL
    const uploadedImageNames = new Set<string>() // track unique names to handle duplicates

    for (const imageFile of imageFiles) {
      try {
        const buffer = await imageFile.arrayBuffer()
        const imageBuffer = Buffer.from(buffer)

        // Get unique name to handle duplicates
        const uniqueName = getUniqueImageName(imageFile.name, uploadedImageNames)
        uploadedImageNames.add(uniqueName)

        // Upload to R2
        const r2Url = await r2Service.uploadWikiImage(
          wiki.slug,
          uniqueName,
          imageBuffer,
          imageFile.type
        )

        // Map original filename to R2 URL for path resolution
        uploadedImageMap.set(imageFile.name, r2Url)

        // Create database record for image
        await prisma.wikiFile.create({
          data: {
            wikiId: wiki.id,
            filename: `imgs/${uniqueName}`,
            originalName: imageFile.name,
            size: imageFile.size,
            url: r2Url,
            uploadedAt: new Date()
          }
        })

        results.push({ filename: imageFile.name, status: 'success' })
      } catch (e) {
        console.error(`Error uploading image ${imageFile.name}:`, e)
        results.push({ filename: imageFile.name, status: 'error', error: String(e) })
      }
    }

    // Process markdown files with image path replacement
    for (const file of markdownFiles) {
      try {
        const originalContent = await file.text()
        const filename = file.name

        // Replace image paths with R2 URLs
        const content = replaceImagePaths(
          originalContent,
          uploadedImageMap,
          Array.from(uploadedImageMap.keys())
        )

        // Check for existing file
        const existingFile = await prisma.wikiFile.findFirst({
          where: { wikiId: wiki.id, filename }
        })

        let fileId = existingFile?.id
        let versionNumber = 1

        if (existingFile) {
          const latestVersion = await prisma.wikiVersion.findFirst({
            where: { fileId: existingFile.id },
            orderBy: { versionNumber: 'desc' }
          })

          if (latestVersion && latestVersion.content === content) {
            results.push({ filename, status: 'skipped' })
            continue
          }
          versionNumber = (latestVersion?.versionNumber || 0) + 1
        } else {
          const newFile = await prisma.wikiFile.create({
            data: {
              wikiId: wiki.id,
              filename,
              originalName: filename,
              size: file.size,
              url: `https://storage.googleapis.com/${process.env.R2_BUCKET}/${wiki.slug}/${filename}`,
              uploadedAt: new Date()
            }
          })
          fileId = newFile.id
        }

        if (!fileId) throw new Error('Failed to get file ID')

        // Upload to R2
        await r2Service.uploadFileVersion(slug, filename, content, versionNumber)

        // Create version
        await prisma.wikiVersion.create({
          data: {
            fileId,
            versionNumber,
            content,
            changeType: existingFile ? 'UPDATE' : 'CREATE',
            changeDescription: 'Uploaded via web interface',
            authorId: session.user.id,
            contentSize: file.size,
            checksum: require('crypto').createHash('md5').update(content).digest('hex')
          }
        })

        // Update file timestamp
        await prisma.wikiFile.update({
          where: { id: fileId },
          data: { updatedAt: new Date() }
        })

        results.push({ filename, status: 'success' })
      } catch (e) {
        console.error(`Error processing ${file.name}:`, e)
        results.push({ filename: file.name, status: 'error', error: String(e) })
      }
    }

    return NextResponse.json({ success: true, wiki, results })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
