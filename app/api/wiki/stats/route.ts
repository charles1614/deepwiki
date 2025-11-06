import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET() {
  try {
    // Get the current session
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // For now, since the schema doesn't have user ownership, return global stats
    // TODO: Update schema to include userId in Wiki model for proper multi-tenancy

    // Get total wikis count
    const totalWikis = await prisma.wiki.count()

    // Get recent uploads (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentUploads = await prisma.wiki.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      }
    })

    // Get total documents count (sum of all files in all wikis)
    const wikiFilesCount = await prisma.wikiFile.count()

    const stats = {
      totalWikis,
      recentUploads,
      totalDocuments: wikiFilesCount
    }

    return NextResponse.json({
      success: true,
      stats
    })
  } catch (error) {
    console.error('Failed to fetch wiki stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}