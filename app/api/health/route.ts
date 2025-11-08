import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simple health check - return 200 OK
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Health check failed'
      },
      { status: 500 }
    )
  }
}