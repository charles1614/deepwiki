import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    // Find the file in the database with latest version
    const file = await prisma.wikiFile.findUnique({
      where: { id: fileId },
      include: {
        wiki: {
          select: {
            slug: true
          }
        },
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!file) {
      console.error(`File not found in database: fileId=${fileId}`)
      return NextResponse.json(
        { success: false, error: `File not found (ID: ${fileId})` },
        { status: 404 }
      )
    }

    // If file has a version in database, use that (for test wikis or when R2 fails)
    const latestVersion = file.versions[0]
    if (latestVersion) {
      return NextResponse.json({
        success: true,
        content: latestVersion.content,
        fileName: file.filename
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
          'ETag': `"${fileId}-${file.uploadedAt.getTime()}"`
        }
      })
    }

    // Fallback to R2 storage (for production wikis)
    try {
      const r2Service = new R2StorageService()
      const result = await r2Service.getWikiFile(file.wiki.slug, file.filename)

      if (result.success && result.content) {
        return NextResponse.json({
          success: true,
          content: result.content,
          fileName: file.filename
        }, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600',
            'ETag': `"${fileId}-${file.uploadedAt.getTime()}"`
          }
        })
      } else {
        console.error(`File content not available from R2: fileId=${fileId}, fileName=${file.filename}, slug=${file.wiki.slug}, error=${result.error}`)
        return NextResponse.json(
          { success: false, error: result.error || `File content not available (${file.filename})` },
          { status: 404 }
        )
      }
    } catch (r2Error) {
      console.error('Error retrieving file from R2:', r2Error)
      return NextResponse.json(
        { success: false, error: 'File content not available from storage' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error fetching file:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch file' },
      { status: 500 }
    )
  }
}