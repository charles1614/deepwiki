import { NextRequest, NextResponse } from 'next/server'
import { R2StorageService } from '@/lib/storage/r2'
import { prisma } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    // Validate files
    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      )
    }

    // Check file size limit (10MB total)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (totalSize > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size too large' },
        { status: 400 }
      )
    }

    // Check for index.md file
    const hasIndexMd = files.some(file => file.name === 'index.md')
    if (!hasIndexMd) {
      return NextResponse.json(
        { success: false, error: 'index.md file is required' },
        { status: 400 }
      )
    }

    // Validate file types (only markdown files)
    for (const file of files) {
      if (!file.name.endsWith('.md')) {
        return NextResponse.json(
          { success: false, error: 'Only markdown (.md) files are allowed' },
          { status: 400 }
        )
      }
    }

    // Convert files to WikiFile format
    const wikiFiles: Array<{
      name: string
      content: string
      size: number
    }> = []

    for (const file of files) {
      const content = await file.text()
      wikiFiles.push({
        name: file.name,
        content,
        size: file.size
      })
    }

    // Extract title from index.md
    const indexFile = wikiFiles.find(file => file.name === 'index.md')
    if (!indexFile) {
      return NextResponse.json(
        { success: false, error: 'index.md file is required' },
        { status: 400 }
      )
    }

    // Initialize R2 service
    const r2Service = new R2StorageService()

    // Generate wiki slug and title from index.md
    const title = r2Service.extractWikiTitle(indexFile.content)
    let slug = r2Service.generateWikiSlug(title)

    // Ensure slug uniqueness to avoid constraint violations
    let isUnique = false
    let attempts = 0
    const maxAttempts = 10

    while (!isUnique && attempts < maxAttempts) {
      const existingWiki = await prisma.wiki.findUnique({
        where: { slug }
      })

      if (!existingWiki) {
        isUnique = true
      } else {
        // Append a random suffix to make it unique
        const randomSuffix = Math.random().toString(36).substring(2, 8)
        slug = r2Service.generateWikiSlug(`${title}-${randomSuffix}`)
        attempts++
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { success: false, error: 'Could not generate unique slug for wiki' },
        { status: 500 }
      )
    }

    // Upload files to R2
    const uploadResult = await r2Service.uploadWikiFiles(slug, wikiFiles)
    if (!uploadResult.success) {
      return NextResponse.json(
        { success: false, error: uploadResult.error || 'Failed to upload wiki files' },
        { status: 500 }
      )
    }

    // Create wiki record in database
    const wiki = await prisma.wiki.create({
      data: {
        title,
        slug,
        description: `Wiki: ${title}`,
        folderName: slug
      }
    })

    // Create file records in database
    const fileRecords = await Promise.all(
      wikiFiles.map(file =>
        prisma.wikiFile.create({
          data: {
            wikiId: wiki.id,
            fileName: file.name,
            filePath: `${slug}/${file.name}`,
            fileSize: file.size,
            contentType: 'text/markdown'
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      wiki: {
        id: wiki.id,
        title: wiki.title,
        slug: wiki.slug,
        description: wiki.description,
        files: fileRecords.map(f => ({
          id: f.id,
          fileName: f.fileName,
          fileSize: f.fileSize
        }))
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading wiki:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create wiki' },
      { status: 500 }
    )
  }
}