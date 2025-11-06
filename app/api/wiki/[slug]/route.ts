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

    return NextResponse.json({
      success: true,
      wiki: {
        id: wiki.id,
        title: wiki.title,
        slug: wiki.slug,
        description: wiki.description,
        createdAt: wiki.createdAt.toISOString(),
        updatedAt: wiki.updatedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching wiki:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wiki' },
      { status: 500 }
    )
  }
}