import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { execSync } from 'child_process'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    // Get the current session
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { wikiIds } = body

    if (!wikiIds || !Array.isArray(wikiIds) || wikiIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid wiki IDs provided' },
        { status: 400 }
      )
    }

    // Validate that all wiki IDs exist
    const existingWikis = await prisma.wiki.findMany({
      where: {
        id: {
          in: wikiIds
        }
      },
      select: {
        id: true,
        folderName: true
      }
    })

    if (existingWikis.length === 0) {
      return NextResponse.json(
        { error: 'No valid wikis found' },
        { status: 404 }
      )
    }

    const validWikiIds = existingWikis.map(w => w.id)
    const folderNames = existingWikis.map(w => w.folderName)

    // Delete wikis from database (this will cascade delete files)
    const deleteResult = await prisma.wiki.deleteMany({
      where: {
        id: {
          in: validWikiIds
        }
      }
    })

    // Delete physical files from storage
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads')

      for (const folderName of folderNames) {
        const folderPath = path.join(uploadsDir, folderName)

        try {
          // Remove directory and all its contents
          execSync(`rm -rf "${folderPath}"`, { stdio: 'ignore' })
        } catch (error) {
          console.warn(`Failed to delete folder ${folderPath}:`, error)
          // Continue even if file deletion fails, as database deletion succeeded
        }
      }
    } catch (error) {
      console.warn('File deletion failed:', error)
      // Continue even if file deletion fails, as database deletion succeeded
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} wiki(s)`
    })

  } catch (error) {
    console.error('Failed to delete wikis:', error)
    return NextResponse.json(
      { error: 'Failed to delete wikis' },
      { status: 500 }
    )
  }
}