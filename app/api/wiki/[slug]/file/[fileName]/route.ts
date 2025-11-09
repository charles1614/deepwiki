import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; fileName: string }> }
) {
  try {
    const { slug, fileName } = await params

    // Find wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug }
    })

    if (!wiki) {
      return NextResponse.json(
        { success: false, error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Verify file exists in database and get latest version
    const file = await prisma.wikiFile.findFirst({
      where: {
        wikiId: wiki.id,
        filename: fileName
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // If file has a version in database, use that (for test wikis or when R2 fails)
    const latestVersion = file.versions[0]
    if (latestVersion) {
      return NextResponse.json({
        success: true,
        content: latestVersion.content
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
        }
      })
    }

    // Fallback to R2 storage (for production wikis)
    try {
      const r2Service = new R2StorageService()
      const result = await r2Service.getWikiFile(slug, fileName)

      if (result.success) {
        return NextResponse.json({
          success: true,
          content: result.content
        }, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
          }
        })
      }
    } catch (r2Error) {
      console.warn('R2 fetch failed, using database version:', r2Error)
    }

    // If no version and R2 failed, return error
    return NextResponse.json(
      { success: false, error: 'File content not found' },
      { status: 404 }
    )

  } catch (error) {
    console.error('Error fetching file content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch file content' },
      { status: 500 }
    )
  }
}