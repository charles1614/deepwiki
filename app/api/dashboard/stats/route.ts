import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(request: Request) {
  try {

    // Get actual stats from database
    const [totalWikis, totalDocuments] = await Promise.all([
      prisma.wiki.count(),
      prisma.wikiFile.count()
    ])

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

    const stats = {
      totalWikis,
      recentUploads,
      totalDocuments,
      averageTimeOnPage: 245, // Mock data for now
      bounceRate: 32 // Mock data for now
    }

    // Mock trends data (replace with actual trend calculations)
    const trends = {
      totalWikis: { direction: 'up' as const, percentage: 15 },
      recentUploads: { direction: 'down' as const, percentage: 5 },
      totalDocuments: { direction: 'up' as const, percentage: 22 }
    }

    return NextResponse.json({
      stats,
      trends
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}