import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Find wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: {
        slug: slug
      },
      include: {
        files: {
          orderBy: {
            fileName: 'asc'
          }
        }
      }
    })

    if (!wiki) {
      return NextResponse.json({ error: 'Wiki not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      wiki: {
        id: wiki.id,
        title: wiki.title,
        slug: wiki.slug,
        description: wiki.description,
        createdAt: wiki.createdAt.toISOString(),
        updatedAt: wiki.updatedAt.toISOString(),
        files: wiki.files.map(file => ({
          id: file.id,
          filename: file.fileName,
          originalName: file.fileName,
          size: file.fileSize,
          url: file.filePath,
          uploadedAt: file.createdAt.toISOString()
        }))
      }
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=600', // Cache for 5 minutes, allow stale for 10 minutes
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