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
      return NextResponse.json(
        { success: false, error: 'File not found' },
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
        })
      } else {
        return NextResponse.json(
          { success: false, error: result.error || 'File content not available' },
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