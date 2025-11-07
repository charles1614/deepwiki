import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

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

    // Fetch all files for this wiki
    const files = await prisma.wikiFile.findMany({
      where: { wikiId: wiki.id },
      orderBy: { fileName: 'asc' }
    })

    return NextResponse.json({
      success: true,
      files
    })

  } catch (error) {
    console.error('Error fetching wiki files:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wiki files' },
      { status: 500 }
    )
  }
}