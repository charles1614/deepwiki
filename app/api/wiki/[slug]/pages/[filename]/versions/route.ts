import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'

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
      include: { owner: true }
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

    // Find the file by filename
    const file = await prisma.wikiFile.findFirst({
      where: {
        wikiId: wiki.id,
        filename
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Get all versions of this file, ordered by most recent first
    const versions = await prisma.wikiVersion.findMany({
      where: {
        fileId: file.id
      },
      include: {
        author: {
          select: {
            id: true,
            email: true
          }
        }
      },
      orderBy: { versionNumber: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: {
        file: {
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          url: file.url,
          uploadedAt: file.uploadedAt,
          updatedAt: file.updatedAt
        },
        versions: versions.map(version => ({
          id: version.id,
          versionNumber: version.versionNumber,
          changeType: version.changeType,
          changeDescription: version.changeDescription,
          contentSize: version.contentSize,
          checksum: version.checksum,
          createdAt: version.createdAt,
          author: version.author
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching version history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch version history' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const { versionId } = body

    // Validate required fields
    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      )
    }

    // Find the wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug },
      include: { owner: true }
    })

    if (!wiki) {
      return NextResponse.json(
        { error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to modify this wiki
    // Admin users can modify any wiki, regular users can only modify their own wikis
    const isAdmin = session.user.role === 'ADMIN'
    const isOwner = wiki.ownerId === session.user.id
    
    if (!isAdmin && !isOwner) {
      // TODO: Check for shared access permissions when implemented
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Find the file by filename
    const file = await prisma.wikiFile.findFirst({
      where: {
        wikiId: wiki.id,
        filename
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Find the version to rollback to
    const targetVersion = await prisma.wikiVersion.findFirst({
      where: {
        id: versionId,
        fileId: file.id
      }
    })

    if (!targetVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    // Get the latest version number to calculate the new version number
    const latestVersion = await prisma.wikiVersion.findFirst({
      where: { fileId: file.id },
      orderBy: { versionNumber: 'desc' }
    })

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1

    // Create a new version with the content from the target version
    const rollbackVersion = await prisma.wikiVersion.create({
      data: {
        fileId: file.id,
        versionNumber: newVersionNumber,
        content: targetVersion.content,
        changeType: 'ROLLBACK',
        changeDescription: `Rollback to version ${targetVersion.versionNumber}`,
        authorId: session.user.id,
        contentSize: targetVersion.contentSize,
        checksum: targetVersion.checksum,
      }
    })

    // Update the file's current content and metadata
    await prisma.wikiFile.update({
      where: { id: file.id },
      data: {
        size: targetVersion.contentSize,
        updatedAt: new Date()
      }
    })

    // Update wiki's updatedAt timestamp
    await prisma.wiki.update({
      where: { id: wiki.id },
      data: { updatedAt: new Date() }
    })

    // Clean up old versions (keep only last 3)
    const allVersions = await prisma.wikiVersion.findMany({
      where: { fileId: file.id },
      orderBy: { versionNumber: 'desc' }
    })

    if (allVersions.length > 3) {
      const versionsToDelete = allVersions.slice(3) // Keep first 3, delete rest
      const versionIdsToDelete = versionsToDelete.map(v => v.id)

      if (versionIdsToDelete.length > 0) {
        await prisma.wikiVersion.deleteMany({
          where: {
            id: { in: versionIdsToDelete }
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        versionId: rollbackVersion.id,
        versionNumber: rollbackVersion.versionNumber,
        content: rollbackVersion.content,
        changeDescription: rollbackVersion.changeDescription,
        createdAt: rollbackVersion.createdAt
      }
    })

  } catch (error) {
    console.error('Error rolling back version:', error)
    return NextResponse.json(
      { error: 'Failed to rollback version' },
      { status: 500 }
    )
  }
}