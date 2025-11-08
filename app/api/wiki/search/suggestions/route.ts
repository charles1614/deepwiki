import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        suggestions: []
      })
    }

    // Search for unique words/phrases in file content that start with the query
    const files = await prisma.wikiFile.findMany({
      where: {
        content: {
          contains: query
        }
      },
      select: {
        content: true
      },
      take: 50 // Limit files to search through
    })

    const suggestions = new Set<string>()

    for (const file of files) {
      if (!file.content) continue

      // Split content into words and find matches
      const words = file.content.toLowerCase().split(/\s+/)
      const queryLower = query.toLowerCase()

      words.forEach(word => {
        // Clean the word (remove punctuation)
        const cleanWord = word.replace(/[^\w]/g, '')

        if (cleanWord.startsWith(queryLower) && cleanWord.length > queryLower.length) {
          suggestions.add(cleanWord)
        }
      })

      // Look for phrases that start with the query
      const phrases = file.content.match(/[A-Z][a-z]+(\s+[a-z]+)*\./g) || []
      phrases.forEach(phrase => {
        const cleanPhrase = phrase.replace(/[^\w\s]/g, '').trim()
        if (cleanPhrase.toLowerCase().startsWith(queryLower)) {
          suggestions.add(cleanPhrase)
        }
      })
    }

    // Convert to array, sort by relevance (shorter matches first), and limit
    const sortedSuggestions = Array.from(suggestions)
      .sort((a, b) => a.length - b.length)
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      suggestions: sortedSuggestions
    })

  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get search suggestions' },
      { status: 500 }
    )
  }
}