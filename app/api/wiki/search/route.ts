import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ wikis: [] })
    }

    // Search wikis by title or description (SQLite doesn't support mode: 'insensitive')
    const wikis = await prisma.wiki.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query
            }
          },
          {
            description: {
              contains: query
            }
          }
        ]
      },
      orderBy: [
        { updatedAt: 'desc' }
      ],
      take: 20, // Limit results to 20
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            files: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      wikis: wikis.map(wiki => ({
        ...wiki,
        fileCount: wiki._count.files
      }))
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search wikis' },
      { status: 500 }
    )
  }
}