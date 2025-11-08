'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { Input } from '@/components/ui/Input'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
  updatedAt: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('q') || '')
  const [searchResults, setSearchResults] = useState<Wiki[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const performSearch = async (query: string) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}`)
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      // API returns { success: true, results: [{ wiki: {...}, matches: [...] }] }
      // Extract wikis from results
      if (data.success && data.results) {
        const wikis = data.results.map((result: any) => result.wiki)
        setSearchResults(wikis)
      } else {
        setSearchResults([])
      }
    } catch (err) {
      setError('Failed to search. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleWikiClick = (wiki: Wiki) => {
    router.push(`/wiki/${wiki.slug}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      const params = new URLSearchParams()
      params.set('q', searchQuery)
      router.push(`/search?${params.toString()}`)
    }
  }

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Search Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Search Wiki Documentation
              </h1>
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for wiki pages, content, or tags..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                    data-testid="search-input"
                  />
                </div>
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  data-testid="search-button"
                >
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </button>
              </form>
            </div>

            {/* Search Results */}
            <div>
              {loading && (
                <div className="text-center py-8">
                  <div className="text-gray-500">Searching...</div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              {!loading && !error && searchQuery.trim() && (
                <div className="mb-4">
                  <p className="text-sm text-gray-500">
                    Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                </div>
              )}

              {!loading && !error && searchResults.length > 0 && (
                <div className="space-y-4">
                  {searchResults.map((wiki) => (
                    <div
                      key={wiki.id}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleWikiClick(wiki)}
                      data-testid={`search-result-${wiki.slug}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {wiki.title}
                          </h3>
                          <p className="text-gray-600 mb-3 line-clamp-2">
                            {wiki.description}
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              /{wiki.slug}
                            </span>
                            <span className="ml-4">
                              Last updated {new Date(wiki.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {!loading && !error && searchQuery.trim() && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    No results found for "{searchQuery}"
                  </div>
                  <p className="text-sm text-gray-400">
                    Try searching with different keywords or check your spelling.
                  </p>
                </div>
              )}

              {!searchQuery.trim() && (
                <div className="text-center py-12">
                  <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start searching
                  </h3>
                  <p className="text-gray-500">
                    Enter keywords to search through your wiki documentation.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}