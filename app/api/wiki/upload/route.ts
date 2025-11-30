import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { R2StorageService } from '@/lib/storage/r2'
import slugify from 'slugify'
import matter from 'gray-matter'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Find index.md to determine wiki properties
    const indexFile = files.find(f => f.name === 'index.md')
    if (!indexFile) {
      return NextResponse.json({ error: 'index.md is required' }, { status: 400 })
    }

    const indexContent = await indexFile.text()
    const { data: frontmatter, content } = matter(indexContent)

    let title = frontmatter.title
    if (!title) {
      // Try to find first H1
      const h1Match = content.match(/^#\s+(.+)$/m)
      if (h1Match) {
        title = h1Match[1].trim()
      }
    }

    if (!title) {
      title = 'Untitled Wiki'
    }

    const slug = frontmatter.slug || slugify(title, { lower: true, strict: true })
    const description = frontmatter.description || ''

    // Create or update Wiki
    let wiki = await prisma.wiki.findUnique({ where: { slug } })

    if (wiki) {
      if (wiki.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
      }
      wiki = await prisma.wiki.update({
        where: { id: wiki.id },
        data: { title, description, updatedAt: new Date() }
      })
    } else {
      try {
        wiki = await prisma.wiki.create({
          data: {
            slug,
            title,
            description,
            ownerId: session.user.id,
            isPublic: true
          }
        })
      } catch (e) {
        return NextResponse.json({ error: 'Wiki slug already exists' }, { status: 409 })
      }
    }

    const r2Service = new R2StorageService()
    const results = []

    for (const file of files) {
      try {
        const content = await file.text()
        const filename = file.name

        // Check for existing file
        const existingFile = await prisma.wikiFile.findFirst({
          where: { wikiId: wiki.id, filename }
        })

        let fileId = existingFile?.id
        let versionNumber = 1

        if (existingFile) {
          const latestVersion = await prisma.wikiVersion.findFirst({
            where: { fileId: existingFile.id },
            orderBy: { versionNumber: 'desc' }
          })

          if (latestVersion && latestVersion.content === content) {
            results.push({ filename, status: 'skipped' })
            continue
          }
          versionNumber = (latestVersion?.versionNumber || 0) + 1
        } else {
          const newFile = await prisma.wikiFile.create({
            data: {
              wikiId: wiki.id,
              filename,
              originalName: filename,
              size: file.size,
              url: `https://storage.googleapis.com/${process.env.R2_BUCKET}/${wiki.slug}/${filename}`,
              uploadedAt: new Date()
            }
          })
          fileId = newFile.id
        }

        if (!fileId) throw new Error('Failed to get file ID')

        // Upload to R2
        await r2Service.uploadFileVersion(slug, filename, content, versionNumber)

        // Create version
        await prisma.wikiVersion.create({
          data: {
            fileId,
            versionNumber,
            content,
            changeType: existingFile ? 'UPDATE' : 'CREATE',
            changeDescription: 'Uploaded via web interface',
            authorId: session.user.id,
            contentSize: file.size,
            checksum: require('crypto').createHash('md5').update(content).digest('hex')
          }
        })

        // Update file timestamp
        await prisma.wikiFile.update({
          where: { id: fileId },
          data: { updatedAt: new Date() }
        })

        results.push({ filename, status: 'success' })
      } catch (e) {
        console.error(`Error processing ${file.name}:`, e)
        results.push({ filename: file.name, status: 'error', error: String(e) })
      }
    }

    return NextResponse.json({ success: true, wiki, results })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
