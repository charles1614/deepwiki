import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, userId, timestamp } = body

    // Validate required fields
    if (!action || !userId || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Log the quick action (in a real implementation, this would be stored in a database)
    console.log('Quick action tracked:', {
      action,
      userId,
      timestamp,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || 'unknown'
    })

    return NextResponse.json({ success: true, message: 'Action tracked' })

  } catch (error) {
    console.error('Error tracking quick action:', error)
    return NextResponse.json(
      { error: 'Failed to track action' },
      { status: 500 }
    )
  }
}