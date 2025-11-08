import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = 10

    const activities: any[] = []

    // Get wiki created activities (from Wiki table)
    if (type === 'all' || type === 'wiki_created') {
      const recentWikis = await prisma.wiki.findMany({
        take: limit * 2, // Get more to account for filtering
        orderBy: { createdAt: 'desc' },
        include: {
          versions: {
            where: { version: 1 },
            take: 1,
            include: {
              user: {
                select: { email: true }
              }
            },
            orderBy: { createdAt: 'asc' }
          }
        }
      })

      for (const wiki of recentWikis) {
        const firstVersion = wiki.versions[0]
        activities.push({
          id: `created-${wiki.id}`,
          type: 'wiki_created',
          wikiTitle: wiki.title,
          userEmail: firstVersion?.user?.email || 'system@deepwiki.com',
          timestamp: wiki.createdAt.toISOString(),
          metadata: { slug: wiki.slug }
        })
      }
    }

    // Get wiki updated activities (from WikiVersion table)
    if (type === 'all' || type === 'wiki_updated') {
      const recentVersions = await prisma.wikiVersion.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          wiki: {
            select: {
              title: true,
              slug: true
            }
          },
          user: {
            select: {
              email: true
            }
          }
        }
      })

      for (const version of recentVersions) {
        // Skip if this is the first version (already counted as created)
        if (version.version === 1) continue

        activities.push({
          id: `updated-${version.id}`,
          type: 'wiki_updated',
          wikiTitle: version.wiki.title,
          userEmail: version.user.email,
          timestamp: version.createdAt.toISOString(),
          metadata: { 
            slug: version.wiki.slug,
            version: version.version,
            changeLog: version.changeLog
          }
        })
      }
    }

    // Note: wiki_deleted activities are not tracked in the current schema
    // We would need to add an ActivityLog table to track deletions

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Filter by type if specified (for created/updated, already filtered above)
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