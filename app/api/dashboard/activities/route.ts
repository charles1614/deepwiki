import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(request: Request) {
  try {

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = 10

    // Build where clause for filtering
    const whereClause: any = {}
    if (type !== 'all') {
      whereClause.type = type
    }

    // Mock activities data for now (replace with actual database queries)
    const activities = [
      {
        id: '1',
        type: 'wiki_created',
        wikiTitle: 'Getting Started Guide',
        userEmail: 'john@example.com',
        timestamp: '2024-01-15T10:30:00Z',
        metadata: { slug: 'getting-started' }
      },
      {
        id: '2',
        type: 'wiki_updated',
        wikiTitle: 'API Documentation',
        userEmail: 'jane@example.com',
        timestamp: '2024-01-15T09:15:00Z',
        metadata: { slug: 'api-docs', changes: 5 }
      },
      {
        id: '3',
        type: 'wiki_deleted',
        wikiTitle: 'Old Documentation',
        userEmail: 'admin@example.com',
        timestamp: '2024-01-14T16:45:00Z',
        metadata: { reason: 'outdated' }
      }
    ]

    // Filter by type if specified
    const filteredActivities = type === 'all'
      ? activities
      : activities.filter(activity => activity.type === type)

    return NextResponse.json({
      activities: filteredActivities.slice(0, limit),
      total: filteredActivities.length
    })

  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}