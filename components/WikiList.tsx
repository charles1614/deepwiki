'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'

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
  onWikiDeleted?: () => void
  enableManagement?: boolean
  showRefreshButton?: boolean
  showHeader?: boolean
  emptyStateMessage?: string
}

export function WikiList({
  onWikiSelect,
  onWikiDeleted,
  enableManagement = false,
  showRefreshButton = true,
  showHeader = true,
  emptyStateMessage = "Upload your first wiki to get started"
}: WikiListProps) {
  const [wikis, setWikis] = useState<Wiki[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Management mode states
  const [isManageMode, setIsManageMode] = useState(false)
  const [selectedWikis, setSelectedWikis] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

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

  // Management mode functions
  const toggleManageMode = useCallback(() => {
    setIsManageMode(!isManageMode)
    setSelectedWikis(new Set())
    setDeleteMessage(null)
  }, [isManageMode])

  const toggleWikiSelection = useCallback((wikiId: string) => {
    const newSelection = new Set(selectedWikis)
    if (newSelection.has(wikiId)) {
      newSelection.delete(wikiId)
    } else {
      newSelection.add(wikiId)
    }
    setSelectedWikis(newSelection)
  }, [selectedWikis])

  const selectAllWikis = useCallback(() => {
    if (selectedWikis.size === wikis.length) {
      setSelectedWikis(new Set())
    } else {
      setSelectedWikis(new Set(wikis.map(w => w.id)))
    }
  }, [selectedWikis, wikis])

  const deleteSelectedWikis = useCallback(async () => {
    if (selectedWikis.size === 0) return

    setDeleting(true)
    try {
      const response = await fetch('/api/wiki/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wikiIds: Array.from(selectedWikis)
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete wikis')
      }

      const result = await response.json()
      if (result.success) {
        setDeleteMessage({
          type: 'success',
          message: `Successfully deleted ${selectedWikis.size} wiki${selectedWikis.size > 1 ? 's' : ''}`
        })
        setSelectedWikis(new Set())
        setDeleteDialogOpen(false)
        setIsManageMode(false)

        // Refresh the wiki list
        await fetchWikis()

        // Notify parent component
        if (onWikiDeleted) {
          onWikiDeleted()
        }

        // Clear success message after 3 seconds
        setTimeout(() => setDeleteMessage(null), 3000)
      } else {
        throw new Error(result.error || 'Failed to delete wikis')
      }
    } catch (err: any) {
      setDeleteMessage({
        type: 'error',
        message: err.message || 'Failed to delete wikis'
      })
    } finally {
      setDeleting(false)
    }
  }, [selectedWikis, fetchWikis, onWikiDeleted])

  // Prefetch wiki metadata on hover to speed up navigation
  const prefetchWiki = useCallback(async (wiki: Wiki) => {
    // Prefetch wiki metadata and file list
    try {
      await fetch(`/api/wiki/slug/${wiki.slug}`, {
        cache: 'default'
      })
    } catch (err) {
      // Silently fail for prefetch
    }
  }, [])

  // Track hover timeouts
  const hoverTimeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleWikiHover = useCallback((wiki: Wiki) => {
    if (isManageMode) {
      return
    }

    // Clear any existing timeout for this wiki
    const existingTimeout = hoverTimeoutsRef.current.get(wiki.id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Delay prefetch to avoid unnecessary requests on quick hovers
    const timeoutId = setTimeout(() => {
      hoverTimeoutsRef.current.delete(wiki.id)
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          prefetchWiki(wiki)
        }, { timeout: 1000 })
      } else {
        prefetchWiki(wiki)
      }
    }, 300) // 300ms delay

    hoverTimeoutsRef.current.set(wiki.id, timeoutId)
  }, [isManageMode, prefetchWiki])

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      hoverTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      hoverTimeoutsRef.current.clear()
    }
  }, [])

  const handleWikiClick = useCallback((wiki: Wiki, event: React.MouseEvent) => {
    if (isManageMode) {
      event.preventDefault()
      toggleWikiSelection(wiki.id)
    } else {
      onWikiSelect(wiki)
    }
  }, [isManageMode, toggleWikiSelection, onWikiSelect])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
          <div className="text-gray-500">Loading wikis...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center mb-4">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mr-3" />
        </div>
        <div className="text-red-600 mb-4 font-medium">{error}</div>
        <button
          onClick={handleRetry}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (wikis.length === 0) {
    return (
      <div className="space-y-6">
        {showHeader && (
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Your Wikis</h2>
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                aria-label="Refresh wiki list"
              >
                Refresh
              </button>
            )}
          </div>
        )}
        <div className="text-center py-16" data-testid="wiki-list-empty">
          <div className="flex flex-col items-center space-y-4">
            <DocumentIcon className="h-12 w-12 text-gray-300" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No wikis found</h3>
              <p className="text-gray-500">{emptyStateMessage}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Management Bar */}
      {enableManagement && isManageMode && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 relative z-20" data-testid="bulk-actions">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedWikis.size === wikis.length && wikis.length > 0}
                onChange={selectAllWikis}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                data-testid="select-all-checkbox"
              />
              <span className="text-sm text-gray-700">
                {selectedWikis.size > 0 ? `${selectedWikis.size} selected` : 'Select all'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {selectedWikis.size > 0 && (
                <button
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={deleting}
                  className="bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center"
                  data-testid="delete-selected-button"
                >
                  <TrashIcon className="h-4 w-4 mr-1.5" />
                  Delete ({selectedWikis.size})
                </button>
              )}
              <button
                onClick={toggleManageMode}
                className="text-gray-600 hover:text-gray-800 px-3 py-1.5 hover:bg-gray-100 rounded transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      {showHeader && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {enableManagement && isManageMode ? 'Manage Wikis' : 'Your Wikis'}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            {showRefreshButton && (
              <button
                onClick={handleRefresh}
                className="text-gray-500 hover:text-gray-700 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
                aria-label="Refresh wiki list"
                data-testid="refresh-button"
              >
                Refresh
              </button>
            )}
            {enableManagement && !isManageMode && (
              <button
                onClick={toggleManageMode}
                className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
                data-testid="manage-wikis-button"
              >
                Manage
              </button>
            )}
            {enableManagement && isManageMode && (
              <button
                onClick={toggleManageMode}
                className="text-red-600 hover:text-red-800 px-3 py-1 hover:bg-red-50 rounded transition-colors"
                data-testid="manage-wikis-button"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      {deleteMessage && (
        <div
          className={`p-4 rounded-lg flex items-center space-x-3 ${
            deleteMessage.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}
          data-testid={deleteMessage.type === 'error' ? 'delete-error-message' : 'delete-success-message'}
        >
          {deleteMessage.type === 'error' ? (
            <ExclamationTriangleIcon className="h-5 w-5" />
          ) : (
            <CheckIcon className="h-5 w-5" />
          )}
          <div>
            <p className="font-medium">{deleteMessage.message}</p>
          </div>
        </div>
      )}

      {/* Wiki Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="wiki-list">
        {wikis.map((wiki) => (
          <div
            key={wiki.id}
            className={`group relative bg-white border rounded-lg transition-all duration-150 ${
              isManageMode
                ? 'border-gray-300 hover:border-gray-400'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            } ${selectedWikis.has(wiki.id) ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50' : ''} ${
              !isManageMode ? 'cursor-pointer' : ''
            }`}
            onClick={(e) => handleWikiClick(wiki, e)}
            onMouseEnter={() => handleWikiHover(wiki)}
            data-testid="wiki-item"
          >
            {/* Checkbox overlay for manage mode */}
            {isManageMode && (
              <div className="absolute top-4 left-4 z-30">
                <input
                  type="checkbox"
                  checked={selectedWikis.has(wiki.id)}
                  onChange={() => toggleWikiSelection(wiki.id)}
                  className="h-4 w-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 absolute"
                  data-testid="wiki-checkbox"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            {/* Wiki Card Content */}
            <div className={`${isManageMode ? 'pl-10 pt-10' : 'p-4'}`}>
              <div className="mb-3">
                <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2">
                  {wiki.title}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {wiki.description}
                </p>
              </div>

              {/* Wiki Metadata */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <DocumentIcon className="h-3 w-3" />
                  <span>{wiki._count.files} files</span>
                </div>
                <div>
                  {formatDate(wiki.createdAt)}
                </div>
              </div>

              {wiki.updatedAt !== wiki.createdAt && (
                <div className="text-xs text-gray-400 mt-1">
                  Updated {formatDate(wiki.updatedAt)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full" data-testid="delete-confirmation-dialog">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 rounded-full p-2 mr-3">
                  <TrashIcon className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Deletion</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to delete {selectedWikis.size} wiki{selectedWikis.size > 1 ? 's' : ''}? This action cannot be undone and will permanently remove all associated files.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteDialogOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  disabled={deleting}
                  data-testid="cancel-delete-button"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSelectedWikis}
                  disabled={deleting}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  data-testid="confirm-delete-button"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}