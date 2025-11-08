import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

interface SearchResult {
  wiki: {
    id: string
    title: string
    slug: string
    description: string | null
    createdAt: string
    updatedAt: string
  }
  matches: Array<{
    file: {
      id: string
      fileName: string
      filePath: string
      contentType: string
    }
    content: string
    snippet?: string
  }>
}

function parseBooleanQuery(query: string): {
  includeTerms: string[]
  excludeTerms: string[]
  exactPhrases: string[]
} {
  const includeTerms: string[] = []
  const excludeTerms: string[] = []
  const exactPhrases: string[] = []

  // Extract exact phrases in quotes
  const phraseRegex = /"([^"]+)"/g
  let match
  while ((match = phraseRegex.exec(query)) !== null) {
    exactPhrases.push(match[1])
  }

  // Remove phrases from query and split remaining terms
  let cleanQuery = query.replace(/"[^"]+"/g, '').trim()
  const terms = cleanQuery.split(/\s+/)

  terms.forEach(term => {
    if (term.toUpperCase() === 'NOT' && includeTerms.length > 0) {
      // Move the last term to exclude
      excludeTerms.push(includeTerms.pop()!)
    } else if (!term.toUpperCase().match(/^(AND|OR|NOT)$/)) {
      includeTerms.push(term)
    }
  })

  return { includeTerms, excludeTerms, exactPhrases }
}

function createContentFilter(terms: string[]) {
  if (terms.length === 0) return {}

  return {
    OR: terms.map(term => ({
      content: {
        contains: term
      }
    }))
  }
}

function createSnippet(content: string, query: string, maxLength: number = 300): string {
  const queryLower = query.toLowerCase()
  const contentLower = content.toLowerCase()
  const index = contentLower.indexOf(queryLower)

  if (index === -1) return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '')

  const start = Math.max(0, index - 50)
  const end = Math.min(content.length, index + query.length + 150)

  let snippet = content.substring(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'

  // Highlight the query term
  const regex = new RegExp(`(${query})`, 'gi')
  snippet = snippet.replace(regex, '<mark>$1</mark>')

  return snippet
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const content = searchParams.get('content') === 'true'
    const highlight = searchParams.get('highlight') === 'true'
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const fileType = searchParams.get('fileType')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, results: [] })
    }

    // Parse boolean query
    const { includeTerms, excludeTerms, exactPhrases } = parseBooleanQuery(query)

    // Create base wiki filter
    const wikiFilter: any = {
      OR: [
        {
          title: {
            contains: query
          }
        },
        {
          description: {
            contains: query
          }
        }
      ]
    }

    // Add date range filter
    if (fromDate || toDate) {
      wikiFilter.updatedAt = {}
      if (fromDate) wikiFilter.updatedAt.gte = new Date(fromDate)
      if (toDate) wikiFilter.updatedAt.lte = new Date(toDate)
    }

    let results: SearchResult[] = []

    if (content) {
      // Search within file content
      const filesFilter: any = {}

      // Add content search
      if (includeTerms.length > 0 || exactPhrases.length > 0) {
        const contentFilter = []

        // Add include terms
        if (includeTerms.length > 0) {
          contentFilter.push(...includeTerms.map(term => ({
            content: { contains: term }
          })))
        }

        // Add exact phrases
        if (exactPhrases.length > 0) {
          contentFilter.push(...exactPhrases.map(phrase => ({
            content: { contains: phrase }
          })))
        }

        filesFilter.OR = contentFilter
      }

      // Add file type filter
      if (fileType) {
        filesFilter.contentType = {
          contains: fileType
        }
      }

      // Add exclude terms
      if (excludeTerms.length > 0) {
        filesFilter.AND = excludeTerms.map(term => ({
          NOT: {
            content: { contains: term }
          }
        }))
      }

      const files = await prisma.wikiFile.findMany({
        where: filesFilter,
        include: {
          wiki: {
            select: {
              id: true,
              title: true,
              slug: true,
              description: true,
              createdAt: true,
              updatedAt: true
            }
          }
        },
        take: limit
      })

      // Group files by wiki and create search results
      const wikiMap = new Map<string, SearchResult>()

      for (const file of files) {
        if (!wikiMap.has(file.wiki.id)) {
          wikiMap.set(file.wiki.id, {
            wiki: {
              ...file.wiki,
              createdAt: file.wiki.createdAt.toISOString(),
              updatedAt: file.wiki.updatedAt.toISOString(),
            },
            matches: []
          })
        }

        const result = wikiMap.get(file.wiki.id)!
        const snippet = highlight && file.content ? createSnippet(file.content, query) : undefined

        result.matches.push({
          file: {
            id: file.id,
            fileName: file.fileName,
            filePath: file.filePath,
            contentType: file.contentType
          },
          content: file.content || '',
          snippet
        })
      }

      results = Array.from(wikiMap.values())
    } else {
      // Traditional wiki metadata search
      const wikis = await prisma.wiki.findMany({
        where: wikiFilter,
        orderBy: [
          { updatedAt: 'desc' }
        ],
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              files: true
            }
          }
        }
      })

      results = wikis.map(wiki => ({
        wiki: {
          ...wiki,
          createdAt: wiki.createdAt.toISOString(),
          updatedAt: wiki.updatedAt.toISOString(),
        },
        matches: []
      }))
    }

    return NextResponse.json({
      success: true,
      results,
      total: results.length
    })

  } catch (error) {
    console.error('Advanced search error:', error)
    return NextResponse.json(
      { error: 'Failed to search wikis' },
      { status: 500 }
    )
  }
}