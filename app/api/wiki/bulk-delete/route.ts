import { NextResponse, NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'

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
        slug: true
      }
    })

    if (existingWikis.length === 0) {
      return NextResponse.json(
        { error: 'No valid wikis found' },
        { status: 404 }
      )
    }

    const validWikiIds = existingWikis.map(w => w.id)
    const wikiSlugs = existingWikis.map(w => w.slug)

    // Delete files from R2 storage for each wiki
    const r2Service = new R2StorageService()
    const r2DeletionResults = []

    for (const slug of wikiSlugs) {
      try {
        const r2Result = await r2Service.deleteWiki(slug)
        if (r2Result.success) {
          r2DeletionResults.push({
            slug,
            deletedFiles: r2Result.deletedFiles || []
          })
          console.log(`Successfully deleted ${r2Result.deletedFiles?.length || 0} files from R2 for wiki: ${slug}`)
        } else {
          console.warn(`Failed to delete R2 files for wiki ${slug}:`, r2Result.error)
          r2DeletionResults.push({
            slug,
            error: r2Result.error
          })
        }
      } catch (r2Error) {
        console.error(`Error deleting R2 files for wiki ${slug}:`, r2Error)
        r2DeletionResults.push({
          slug,
          error: r2Error instanceof Error ? r2Error.message : 'Unknown R2 deletion error'
        })
      }
    }

    // Delete wikis from database (this will cascade delete files)
    const deleteResult = await prisma.wiki.deleteMany({
      where: {
        id: {
          in: validWikiIds
        }
      }
    })

    const successfulR2Deletions = r2DeletionResults.filter(r => !r.error)
    const totalR2FilesDeleted = successfulR2Deletions.reduce((sum, r) => sum + (r.deletedFiles?.length || 0), 0)

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      r2DeletedCount: successfulR2Deletions.length,
      totalR2FilesDeleted,
      message: `Successfully deleted ${deleteResult.count} wiki(s) and ${totalR2FilesDeleted} files from cloud storage`
    })

  } catch (error) {
    console.error('Failed to delete wikis:', error)
    return NextResponse.json(
      { error: 'Failed to delete wikis' },
      { status: 500 }
    )
  }
}