import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params

    // Find the file in the database
    const file = await prisma.wikiFile.findUnique({
      where: { id: fileId },
      include: {
        wiki: {
          select: {
            slug: true
          }
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

    // Try to get file content from R2 storage
    try {
      const r2Service = new R2StorageService()
      const result = await r2Service.getWikiFile(file.wiki.slug, file.fileName)

      if (result.success && result.content) {
        return NextResponse.json({
          success: true,
          content: result.content,
          fileName: file.fileName
        }, {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600', // Cache for 30 minutes, allow stale for 1 hour
            'ETag': `"${fileId}-${file.updatedAt.getTime()}"` // Use file ID and update time for ETag
          }
        })
      } else {
        console.error(`File content not available from R2: fileId=${fileId}, fileName=${file.fileName}, slug=${file.wiki.slug}, error=${result.error}`)
        return NextResponse.json(
          { success: false, error: result.error || `File content not available (${file.fileName})` },
          { status: 404 }
        )
      }
    } catch (r2Error) {
      console.error('Error retrieving file from R2:', r2Error)

      // If R2 retrieval fails, try fallback method if any
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