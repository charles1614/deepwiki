import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> }
) {
  try {
    const { slug, filename } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find the wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug },
      include: {
        owner: true,
        files: {
          where: { filename },
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
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

    // Find the specific file
    const file = wiki.files[0]
    if (!file) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    // Get the latest version content
    const latestVersion = file.versions[0]
    if (!latestVersion) {
      return NextResponse.json(
        { error: 'Page content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        url: file.url,
        uploadedAt: file.uploadedAt,
        content: latestVersion.content,
        lastVersion: latestVersion,
      },
      content: latestVersion.content
    })

  } catch (error) {
    console.error('Error fetching page:', error)
    return NextResponse.json(
      { error: 'Failed to fetch page' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> }
) {
  try {
    const { slug, filename } = await params
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content } = body

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
      where: { slug },
      include: {
        owner: true,
        files: {
          where: { filename },
          include: {
            versions: {
              orderBy: { createdAt: 'desc' },
            },
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

    // Check if user has permission to edit this wiki
    // Admin users can edit any wiki, regular users can only edit their own wikis
    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = wiki.ownerId === session.user.id
    
    if (!isAdmin && !isOwner) {
      // TODO: Check for shared access permissions when implemented
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Find the specific file
    const file = wiki.files[0]
    if (!file) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      )
    }

    // Get the latest version number
    const latestVersion = file.versions[0]
    const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1

    // Upload version content to R2 storage to reduce database pressure
    const r2Service = new R2StorageService()
    const r2UploadResult = await r2Service.uploadFileVersion(
      slug,
      filename,
      content,
      newVersionNumber
    )

    // Log R2 upload result but don't fail if it fails (database is primary storage)
    if (!r2UploadResult.success) {
      console.warn('Failed to upload version to R2, continuing with database storage:', r2UploadResult.error)
    }

    // Create new version in database (still store content for fast access and backward compatibility)
    const newVersion = await prisma.wikiVersion.create({
      data: {
        fileId: file.id,
        versionNumber: newVersionNumber,
        content: content,
        changeType: 'UPDATE',
        changeDescription: 'Page content updated',
        authorId: session.user.id,
        contentSize: Buffer.byteLength(content, 'utf8'),
        checksum: require('crypto')
          .createHash('md5')
          .update(content)
          .digest('hex'),
      }
    })

    // Update file size
    await prisma.wikiFile.update({
      where: { id: file.id },
      data: {
        size: Buffer.byteLength(content, 'utf8'),
        updatedAt: new Date()
      }
    })

    // Update wiki's updatedAt timestamp
    await prisma.wiki.update({
      where: { id: wiki.id },
      data: { updatedAt: new Date() }
    })

    // Maintain only last 3 versions (cleanup older versions from database and R2)
    const allVersions = await prisma.wikiVersion.findMany({
      where: { fileId: file.id },
      orderBy: { versionNumber: 'desc' }
    })

    if (allVersions.length > 3) {
      const versionsToDelete = allVersions.slice(3)
      
      // Delete old versions from database
      await prisma.wikiVersion.deleteMany({
        where: {
          id: { in: versionsToDelete.map(v => v.id) }
        }
      })

      // Delete old versions from R2 storage
      for (const version of versionsToDelete) {
        const r2DeleteResult = await r2Service.deleteFileVersion(slug, filename, version.versionNumber)
        if (!r2DeleteResult.success) {
          // Log but don't fail if R2 deletion fails
          console.warn(`Failed to delete old version ${version.versionNumber} from R2:`, r2DeleteResult.error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: file.id,
        filename: file.filename,
        versionId: newVersion.id,
        versionNumber: newVersion.versionNumber,
        updatedAt: new Date()
      }
    })

  } catch (error) {
    console.error('Error updating page:', error)
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    )
  }
}
