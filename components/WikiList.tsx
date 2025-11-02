'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
  _count: {
    files: number
  }
}

interface WikiListProps {
  onWikiSelect: (wiki: Wiki) => void
}

export function WikiList({ onWikiSelect }: WikiListProps) {
  const [wikis, setWikis] = useState<Wiki[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWikis = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/wiki/list')

      if (!response.ok) {
        throw new Error('Failed to fetch wikis')
      }

      const result = await response.json()

      if (result.success) {
        setWikis(result.wikis || [])
      } else {
        setError(result.error || 'Failed to load wikis')
      }
    } catch (err) {
      setError('Failed to load wikis. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWikis()
  }, [fetchWikis])

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }, [])

  const handleRetry = useCallback(() => {
    fetchWikis()
  }, [fetchWikis])

  const handleRefresh = useCallback(() => {
    fetchWikis()
  }, [fetchWikis])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading wikis...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={handleRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (wikis.length === 0) {
    return (
      <div className="text-center py-12" data-testid="wiki-list-empty">
        <div className="text-gray-500 mb-2">No wikis found</div>
        <div className="text-gray-400 text-sm">Upload your first wiki to get started</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Your Wikis</h2>
        <button
          onClick={handleRefresh}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
          aria-label="Refresh wiki list"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="wiki-list">
        {wikis.map((wiki) => (
          <button
            key={wiki.id}
            onClick={() => onWikiSelect(wiki)}
            className="wiki-item text-left p-6 bg-white border border-gray-200 rounded-lg shadow-sm
                     hover:shadow-md hover:border-blue-300 transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label={`View ${wiki.title}`}
            data-testid="wiki-item"
          >
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {wiki.title}
              </h3>

              <p className="text-sm text-gray-600 line-clamp-2">
                {wiki.description}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{wiki._count.files} files</span>
                <span>Created {formatDate(wiki.createdAt)}</span>
              </div>

              {wiki.updatedAt !== wiki.createdAt && (
                <div className="text-xs text-gray-400">
                  Updated {formatDate(wiki.updatedAt)}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}