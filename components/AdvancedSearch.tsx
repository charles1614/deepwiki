'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import { searchWiki, getSearchSuggestions, type SearchResult, type SearchOptions } from '@/lib/api/search'

export default function AdvancedSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    content: false,
    highlight: false,
    fromDate: '',
    toDate: '',
    fileType: '',
    limit: 20
  })
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Debounced search
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([])
        setSuggestions([])
        return
      }

      try {
        setLoading(true)
        setError(null)

        const searchResult = await searchWiki(searchQuery, searchOptions)
        setResults(searchResult.results)

        // Get suggestions for next time
        if (searchQuery.length >= 2 && searchQuery.length <= 5) {
          try {
            const suggestionResult = await getSearchSuggestions(searchQuery)
            setSuggestions(suggestionResult.suggestions)
          } catch (suggestionError) {
            // Don't fail the whole search if suggestions fail
            console.warn('Failed to get suggestions:', suggestionError)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to search. Please try again.')
      } finally {
        setLoading(false)
      }
    },
    [searchOptions]
  )

  // Search when query or options change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      debouncedSearch(query)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, debouncedSearch])

  // Handle query change
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setShowSuggestions(value.length >= 2 && value.length <= 5)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    debouncedSearch(suggestion)
  }

  // Handle filter changes
  const handleFilterChange = (filterName: keyof SearchOptions, value: any) => {
    setSearchOptions(prev => ({
      ...prev,
      [filterName]: value
    }))
  }

  // Handle result click
  const handleResultClick = (wiki: SearchResult['wiki']) => {
    router.push(`/wiki/${wiki.slug}`)
  }

  // Clear search
  const handleClearSearch = () => {
    setQuery('')
    setResults([])
    setSuggestions([])
    setShowSuggestions(false)
  }

  // Format date for input
  const formatDateForInput = (date: Date | string) => {
    if (typeof date === 'string') {
      date = new Date(date)
    }
    return date.toISOString().split('T')[0]
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Search Header */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Advanced Search</h1>

          <div className="relative">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search wiki content, titles, or descriptions..."
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="search-input"
                autoFocus
              />
              {query && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Search Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
                <ul className="max-h-48 overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <div className="mt-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Advanced Filters
              {showFilters ? (
                <ChevronUpIcon className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 ml-1" />
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200" data-testid="advanced-filters">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Content Search */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="content-search"
                  checked={searchOptions.content}
                  onChange={(e) => handleFilterChange('content', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="content-search" className="ml-2 text-sm font-medium text-gray-700">
                  Search in content
                </label>
              </div>

              {/* Highlight Matches */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="highlight-matches"
                  checked={searchOptions.highlight}
                  onChange={(e) => handleFilterChange('highlight', e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="highlight-matches" className="ml-2 text-sm font-medium text-gray-700">
                  Highlight matches
                </label>
              </div>

              {/* File Type */}
              <div>
                <label htmlFor="file-type" className="block text-sm font-medium text-gray-700 mb-1">
                  File type
                </label>
                <select
                  id="file-type"
                  value={searchOptions.fileType}
                  onChange={(e) => handleFilterChange('fileType', e.target.value)}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="">All files</option>
                  <option value="markdown">Markdown</option>
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="css">CSS</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="from-date" className="block text-sm font-medium text-gray-700 mb-1">
                    From date
                  </label>
                  <input
                    type="date"
                    id="from-date"
                    value={searchOptions.fromDate ? formatDateForInput(searchOptions.fromDate) : ''}
                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="to-date" className="block text-sm font-medium text-gray-700 mb-1">
                    To date
                  </label>
                  <input
                    type="date"
                    id="to-date"
                    value={searchOptions.toDate ? formatDateForInput(searchOptions.toDate) : ''}
                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        <div className="p-6">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8" data-testid="search-loading">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Searching...</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {/* Results Count */}
          {!loading && !error && query && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
              </p>
            </div>
          )}

          {/* Results List */}
          {!loading && !error && results.length > 0 && (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.wiki.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleResultClick(result.wiki)}
                  data-testid={`search-result-${result.wiki.slug}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {result.wiki.title}
                      </h3>
                      <p className="text-gray-600 mb-3 line-clamp-2">
                        {result.wiki.description}
                      </p>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          /{result.wiki.slug}
                        </span>
                        <span className="ml-4">
                          Last updated {new Date(result.wiki.updatedAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* File Matches */}
                      {result.matches.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Found in {result.matches.length} file{result.matches.length !== 1 ? 's' : ''}:
                          </h4>
                          <div className="space-y-2">
                            {result.matches.map((match, index) => (
                              <div
                                key={index}
                                className="text-sm bg-gray-50 p-3 rounded border border-gray-200"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-gray-700">
                                    {match.file.fileName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {match.file.contentType}
                                  </span>
                                </div>
                                {match.snippet ? (
                                  <div
                                    className="text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: match.snippet }}
                                  />
                                ) : (
                                  <div className="text-gray-500 italic text-xs line-clamp-3">
                                    {match.content.substring(0, 150)}...
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {!loading && !error && query && results.length === 0 && (
            <div className="text-center py-8">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No results found
              </h3>
              <p className="text-gray-500 mb-4">
                No results found for "{query}"
              </p>
              <p className="text-sm text-gray-400">
                Try different keywords, check your spelling, or adjust your filters.
              </p>
            </div>
          )}

          {/* Initial State */}
          {!loading && !error && !query && (
            <div className="text-center py-12">
              <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Start searching
              </h3>
              <p className="text-gray-500">
                Enter keywords to search through your wiki content. Use advanced filters for more specific results.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}