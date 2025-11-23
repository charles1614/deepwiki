import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id

    // If user is not authenticated, only return public wikis
    if (!userId) {
      const publicWikis = await prisma.wiki.findMany({
        where: {
          isPublic: true
        },
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
        wikis: publicWikis
      })
    }

    // If user is authenticated, return all wikis they have access to
    // This includes their own wikis (public and private) plus all public wikis from other users
    const wikis = await prisma.wiki.findMany({
      where: {
        OR: [
          { ownerId: userId }, // User's own wikis (regardless of privacy)
          { isPublic: true }  // All public wikis
        ]
      },
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