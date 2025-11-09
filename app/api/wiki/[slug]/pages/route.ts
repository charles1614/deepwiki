import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/database'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, filename } = body

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Page title is required' },
        { status: 400 }
      )
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Page content is required' },
        { status: 400 }
      )
    }

    // Find the wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug: params.slug },
      include: { owner: true }
    })

    if (!wiki) {
      return NextResponse.json(
        { error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to add pages to this wiki
    // Admin users can add pages to any wiki, regular users can only add pages to their own wikis
    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = wiki.ownerId === session.user.id
    
    if (!isAdmin && !isOwner) {
      // TODO: Check for shared access permissions when implemented
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Generate filename if not provided
    let finalFilename = filename
    if (!finalFilename) {
      // Generate filename from title
      const generatedName = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      finalFilename = generatedName || 'untitled'
      if (!finalFilename.endsWith('.md')) {
        finalFilename += '.md'
      }
    }

    // Check if filename already exists in this wiki
    const existingFile = await prisma.wikiFile.findFirst({
      where: {
        wikiId: wiki.id,
        filename: finalFilename
      }
    })

    if (existingFile) {
      return NextResponse.json(
        { error: 'File already exists' },
        { status: 409 }
      )
    }

    // Create the new page file
    const newFile = await prisma.wikiFile.create({
      data: {
        wikiId: wiki.id,
        filename: finalFilename,
        originalName: finalFilename,
        size: Buffer.byteLength(content, 'utf8'),
        url: `https://storage.googleapis.com/${process.env.R2_BUCKET}/${wiki.slug}/${finalFilename}`,
        uploadedAt: new Date(),
      }
    })

    // Create initial version
    const newVersion = await prisma.wikiVersion.create({
      data: {
        fileId: newFile.id,
        versionNumber: 1,
        content: content,
        changeType: 'CREATE',
        changeDescription: 'Initial page creation',
        authorId: session.user.id,
        contentSize: Buffer.byteLength(content, 'utf8'),
        checksum: require('crypto')
          .createHash('md5')
          .update(content)
          .digest('hex'),
      }
    })

    // Update wiki's updatedAt timestamp
    await prisma.wiki.update({
      where: { id: wiki.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: newFile.id,
        filename: finalFilename,
        versionId: newVersion.id,
        createdAt: newFile.uploadedAt
      }
    })

  } catch (error) {
    console.error('Error creating page:', error)
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug: params.slug },
      include: {
        files: {
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { filename: 'asc' },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!wiki) {
      return NextResponse.json(
        { error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view this wiki
    // Admin users can view any wiki, regular users can only view their own wikis
    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = wiki.ownerId === session.user.id
    
    if (!isAdmin && !isOwner) {
      // TODO: Check for shared access permissions when implemented
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        wiki,
        pages: wiki.files.map(file => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          url: file.url,
          uploadedAt: file.uploadedAt,
          lastVersion: file.versions[0] || null,
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fileIds } = body

    // Validate required fields
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: 'File IDs are required' },
        { status: 400 }
      )
    }

    // Find the wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug: params.slug },
      include: { owner: true }
    })

    if (!wiki) {
      return NextResponse.json(
        { error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete pages from this wiki
    // Admin users can delete pages from any wiki, regular users can only delete pages from their own wikis
    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = wiki.ownerId === session.user.id
    
    if (!isAdmin && !isOwner) {
      // TODO: Check for shared access permissions when implemented
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Get files to delete
    const filesToDelete = await prisma.wikiFile.findMany({
      where: {
        id: { in: fileIds },
        wikiId: wiki.id
      },
      include: {
        versions: true
      }
    })

    if (filesToDelete.length === 0) {
      return NextResponse.json(
        { error: 'No files found to delete' },
        { status: 404 }
      )
    }

    // Check if any of the files is index.md (should not be deletable)
    const indexFile = filesToDelete.find(file => file.filename === 'index.md')
    if (indexFile) {
      return NextResponse.json(
        { error: 'Cannot delete index.md - it is the main page of this wiki' },
        { status: 400 }
      )
    }

    // Delete all versions of each file
    const versionIdsToDelete = filesToDelete.flatMap(file => file.versions.map(v => v.id))
    if (versionIdsToDelete.length > 0) {
      await prisma.wikiVersion.deleteMany({
        where: {
          id: { in: versionIdsToDelete }
        }
      })
    }

    // Delete the files
    const deletedFiles = await prisma.wikiFile.deleteMany({
      where: {
        id: { in: fileIds },
        wikiId: wiki.id
      }
    })

    // Update wiki's updatedAt timestamp
    await prisma.wiki.update({
      where: { id: wiki.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        deletedFiles: filesToDelete.map(file => ({
          id: file.id,
          filename: file.filename
        })),
        count: deletedFiles.count
      }
    })

  } catch (error) {
    console.error('Error deleting pages:', error)
    return NextResponse.json(
      { error: 'Failed to delete pages' },
      { status: 500 }
    )
  }
}