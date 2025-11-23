import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { auth } from '@/lib/auth'

// GET current privacy setting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Find wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublic: true,
        ownerId: true
      }
    })

    if (!wiki) {
      return NextResponse.json(
        { success: false, error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Check if user owns this wiki
    if (wiki.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      privacy: {
        isPublic: wiki.isPublic,
        wiki: {
          id: wiki.id,
          title: wiki.title,
          slug: wiki.slug
        }
      }
    })

  } catch (error) {
    console.error('Error fetching privacy setting:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch privacy setting' },
      { status: 500 }
    )
  }
}

// PUT update privacy setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const session = await auth()
    const userId = session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { isPublic } = body

    if (typeof isPublic !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'isPublic must be a boolean value' },
        { status: 400 }
      )
    }

    // Find wiki by slug and verify ownership
    const wiki = await prisma.wiki.findUnique({
      where: { slug },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublic: true,
        ownerId: true
      }
    })

    if (!wiki) {
      return NextResponse.json(
        { success: false, error: 'Wiki not found' },
        { status: 404 }
      )
    }

    // Check if user owns this wiki
    if (wiki.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Permission denied' },
        { status: 403 }
      )
    }

    // Update privacy setting
    const updatedWiki = await prisma.wiki.update({
      where: { slug },
      data: { isPublic },
      select: {
        id: true,
        title: true,
        slug: true,
        isPublic: true,
        updatedAt: true
      }
    })

    return NextResponse.json({
      success: true,
      message: `Wiki is now ${updatedWiki.isPublic ? 'public' : 'private'}`,
      privacy: {
        isPublic: updatedWiki.isPublic,
        wiki: {
          id: updatedWiki.id,
          title: updatedWiki.title,
          slug: updatedWiki.slug
        }
      },
      updatedAt: updatedWiki.updatedAt.toISOString()
    })

  } catch (error) {
    console.error('Error updating privacy setting:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update privacy setting' },
      { status: 500 }
    )
  }
}