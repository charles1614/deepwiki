import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Test helper endpoint to create wiki and pages without R2 storage
// This is only available in test/development environment
export async function POST(request: NextRequest) {
  // Only allow in test/development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, slug, content, isPublic } = body

    if (!title || !slug || !content) {
      return NextResponse.json(
        { error: 'Title, slug, and content are required' },
        { status: 400 }
      )
    }

    // Create wiki
    const wiki = await prisma.wiki.create({
      data: {
        title,
        slug,
        description: `Test Wiki: ${title}`,
        isPublic: isPublic ?? false, // Default to private for test wikis
        ownerId: session.user.id,
      }
    })

    // Create index.md file
    const file = await prisma.wikiFile.create({
      data: {
        wikiId: wiki.id,
        filename: 'index.md',
        originalName: 'index.md',
        size: Buffer.byteLength(content, 'utf8'),
        url: `test://${slug}/index.md`, // Test URL, not real R2 URL
        uploadedAt: new Date(),
      }
    })

    // Create initial version
    const version = await prisma.wikiVersion.create({
      data: {
        fileId: file.id,
        versionNumber: 1,
        content: content,
        changeType: 'CREATE',
        changeDescription: 'Initial page creation for testing',
        authorId: session.user.id,
        contentSize: Buffer.byteLength(content, 'utf8'),
        checksum: require('crypto')
          .createHash('md5')
          .update(content)
          .digest('hex'),
      }
    })

    return NextResponse.json({
      success: true,
      slug: wiki.slug, // For compatibility with tests
      data: {
        wiki: {
          id: wiki.id,
          title: wiki.title,
          slug: wiki.slug,
          isPublic: wiki.isPublic,
        },
        file: {
          id: file.id,
          filename: file.filename,
        },
        version: {
          id: version.id,
          versionNumber: version.versionNumber,
        }
      },
      files: [ // For compatibility with existing tests
        {
          id: file.id,
          filename: file.filename,
        }
      ]
    })

  } catch (error) {
    console.error('Error creating test wiki:', error)
    return NextResponse.json(
      { error: 'Failed to create test wiki' },
      { status: 500 }
    )
  }
}

