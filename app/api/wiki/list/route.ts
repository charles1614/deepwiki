import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    // Fetch all wikis with file counts
    const wikis = await prisma.wiki.findMany({
      include: {
        _count: {
          select: {
            files: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      wikis
    })

  } catch (error) {
    console.error('Error fetching wikis:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wikis' },
      { status: 500 }
    )
  }
}