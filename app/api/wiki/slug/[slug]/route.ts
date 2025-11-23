import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { auth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()
    const userId = session?.user?.id

    // Find wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: {
        slug: slug
      },
      include: {
        files: {
          orderBy: {
            filename: 'asc'
          }
        }
      }
    })

    if (!wiki) {
      return NextResponse.json({ error: 'Wiki not found' }, { status: 404 })
    }

    // Check privacy permissions
    if (!wiki.isPublic && wiki.ownerId !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Access denied: This wiki is private'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      wiki: {
        id: wiki.id,
        title: wiki.title,
        slug: wiki.slug,
        description: wiki.description,
        isPublic: wiki.isPublic,
        ownerId: wiki.ownerId,
        createdAt: wiki.createdAt.toISOString(),
        updatedAt: wiki.updatedAt.toISOString(),
        files: wiki.files.map(file => ({
          id: file.id,
          filename: file.filename,
          originalName: file.originalName,
          size: file.size,
          url: file.url,
          uploadedAt: file.uploadedAt.toISOString()
        }))
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': wiki.isPublic
          ? 'public, max-age=300, s-maxage=300, stale-while-revalidate=600' // Cache public wikis
          : 'private, no-cache, no-store, must-revalidate', // Don't cache private wikis
        'ETag': `"${wiki.id}-${wiki.updatedAt.getTime()}"` // Use wiki ID and update time for ETag
      }
    })

  } catch (error) {
    console.error('Error fetching wiki:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wiki' },
      { status: 500 }
    )
  }
}