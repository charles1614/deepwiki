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

    // Verify file exists in database
    const file = await prisma.wikiFile.findFirst({
      where: {
        wikiId: wiki.id,
        fileName
      }
    })

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      )
    }

    // Fetch file content from R2
    const r2Service = new R2StorageService()
    const result = await r2Service.getWikiFile(slug, fileName)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to fetch file content' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      content: result.content
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    })

  } catch (error) {
    console.error('Error fetching file content:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch file content' },
      { status: 500 }
    )
  }
}