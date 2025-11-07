import { NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // Find wiki by slug
    const wiki = await prisma.wiki.findUnique({
      where: {
        slug: slug
      },
      include: {
        files: {
          orderBy: {
            fileName: 'asc'
          }
        }
      }
    })

    if (!wiki) {
      return NextResponse.json({ error: 'Wiki not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      wiki: {
        id: wiki.id,
        title: wiki.title,
        slug: wiki.slug,
        description: wiki.description,
        createdAt: wiki.createdAt.toISOString(),
        updatedAt: wiki.updatedAt.toISOString(),
        files: wiki.files.map(file => ({
          id: file.id,
          filename: file.fileName,
          originalName: file.fileName,
          size: file.fileSize,
          url: file.filePath,
          uploadedAt: file.createdAt.toISOString()
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching wiki:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wiki' },
      { status: 500 }
    )
  }
}