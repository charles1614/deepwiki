// Advanced search API functions

export interface SearchResult {
  wiki: {
    id: string
    title: string
    slug: string
    description: string
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

export interface SearchOptions {
  content?: boolean
  highlight?: boolean
  fromDate?: string
  toDate?: string
  fileType?: string
  limit?: number
}

export async function searchWiki(
  query: string,
  options: SearchOptions = {}
): Promise<{ success: boolean; results: SearchResult[]; total: number }> {
  const params = new URLSearchParams()
  params.append('q', query)

  if (options.content) params.append('content', 'true')
  if (options.highlight) params.append('highlight', 'true')
  if (options.fromDate) params.append('fromDate', options.fromDate)
  if (options.toDate) params.append('toDate', options.toDate)
  if (options.fileType) params.append('fileType', options.fileType)
  if (options.limit) params.append('limit', options.limit.toString())

  const response = await fetch(`/api/wiki/search?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to search wikis')
  }

  return await response.json()
}

export async function getSearchSuggestions(
  query: string,
  limit: number = 10
): Promise<{ success: boolean; suggestions: string[] }> {
  const params = new URLSearchParams()
  params.append('q', query)
  params.append('limit', limit.toString())

  const response = await fetch(`/api/wiki/search/suggestions?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to get search suggestions')
  }

  return await response.json()
}