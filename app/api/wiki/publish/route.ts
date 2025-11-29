import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'

interface FileUpload {
  filename: string
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { slug, title, files } = body as { slug: string; title?: string; files: FileUpload[] }

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 }
      )
    }

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Check if wiki exists
    let wiki = await prisma.wiki.findUnique({
      where: { slug }
    })

    if (wiki) {
      // Check permission
      const isAdmin = session.user.role === 'ADMIN'
      const isOwner = wiki.ownerId === session.user.id

      if (!isAdmin && !isOwner) {
        return NextResponse.json(
          { error: 'Permission denied' },
          { status: 403 }
        )
      }

      // Update wiki title if provided
      if (title && title !== wiki.title) {
        wiki = await prisma.wiki.update({
          where: { id: wiki.id },
          data: { title }
        })
      }
    } else {
      // Create new wiki
      // Check if slug is taken (though findUnique above handles it, race conditions exist)
      // Actually findUnique returned null so we are good to try create
      try {
        wiki = await prisma.wiki.create({
          data: {
            slug,
            title: title || slug,
            ownerId: session.user.id,
            isPublic: true // Default to public for published wikis? Or make it an option? Defaulting to true for now as "Publish" implies public.
          }
        })
      } catch (e) {
        // Handle unique constraint violation just in case
        return NextResponse.json(
          { error: 'Wiki slug already exists' },
          { status: 409 }
        )
      }
    }

    const r2Service = new R2StorageService()
    const results = []

    for (const file of files) {
      try {
        const { filename, content } = file

        // Check if file exists
        const existingFile = await prisma.wikiFile.findFirst({
          where: {
            wikiId: wiki.id,
            filename
          }
        })

        let fileId = existingFile?.id
        let versionNumber = 1

        if (existingFile) {
          // Check if content changed
          const latestVersion = await prisma.wikiVersion.findFirst({
            where: { fileId: existingFile.id },
            orderBy: { versionNumber: 'desc' }
          })

          if (latestVersion && latestVersion.content === content) {
            results.push({ filename, status: 'skipped', reason: 'Content unchanged' })
            continue
          }

          versionNumber = (latestVersion?.versionNumber || 0) + 1
        } else {
          // Create new file record
          const newFile = await prisma.wikiFile.create({
            data: {
              wikiId: wiki.id,
              filename,
              originalName: filename,
              size: Buffer.byteLength(content, 'utf8'),
              url: `https://storage.googleapis.com/${process.env.R2_BUCKET}/${wiki.slug}/${filename}`, // Placeholder URL logic
              uploadedAt: new Date(),
            }
          })
          fileId = newFile.id
        }

        if (!fileId) throw new Error('Failed to get file ID')

        // Upload to R2
        const r2UploadResult = await r2Service.uploadFileVersion(
          slug,
          filename,
          content,
          versionNumber
        )

        if (!r2UploadResult.success) {
          console.warn(`Failed to upload ${filename} to R2:`, r2UploadResult.error)
        }

        // Create version record
        await prisma.wikiVersion.create({
          data: {
            fileId,
            versionNumber,
            content,
            changeType: existingFile ? 'UPDATE' : 'CREATE',
            changeDescription: existingFile ? 'Updated via publish' : 'Initial publish',
            authorId: session.user.id,
            contentSize: Buffer.byteLength(content, 'utf8'),
            checksum: require('crypto').createHash('md5').update(content).digest('hex'),
          }
        })

        // Update file timestamp
        await prisma.wikiFile.update({
          where: { id: fileId },
          data: { updatedAt: new Date() }
        })

        results.push({ filename, status: existingFile ? 'updated' : 'created' })

      } catch (error) {
        console.error(`Error processing file ${file.filename}:`, error)
        results.push({ filename: file.filename, status: 'error', error: String(error) })
      }
    }

    // Update wiki timestamp
    await prisma.wiki.update({
      where: { id: wiki.id },
      data: { updatedAt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        wiki,
        results
      }
    })

  } catch (error) {
    console.error('Error publishing wiki:', error)
    return NextResponse.json(
      { error: 'Failed to publish wiki' },
      { status: 500 }
    )
  }
}
