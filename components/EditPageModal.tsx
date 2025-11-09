'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

interface WikiFile {
  id: string
  filename: string
  originalName: string
  size: number
  url: string
  uploadedAt: string
}

interface EditPageModalProps {
  wiki: Wiki
  file: WikiFile
  isOpen: boolean
  onClose: () => void
  onPageUpdated: (file: { id: string; filename: string; versionId: string }) => void
}

export function EditPageModal({ wiki, file, isOpen, onClose, onPageUpdated }: EditPageModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingContent, setIsLoadingContent] = useState(true)
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')

  // Extract title from filename on mount
  const extractTitleFromFilename = (filename: string): string => {
    return filename
      .replace('.md', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  // Load existing page content
  useEffect(() => {
    if (!isOpen) return

    const loadPageContent = async () => {
      setIsLoadingContent(true)
      setError('')

      try {
        const response = await fetch(`/api/wiki/${wiki.slug}/pages/${file.filename}`)

        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setContent(result.content)
            // Extract title from content or use filename
            const titleMatch = result.content.match(/^#\s+(.+)$/m)
            setTitle(titleMatch ? titleMatch[1] : extractTitleFromFilename(file.filename))
          } else {
            setError(result.error || 'Failed to load page content')
          }
        } else {
          const errorData = await response.json()
          setError(errorData.error || 'Failed to load page content')
        }
      } catch (err) {
        setError('An error occurred while loading the page content')
      } finally {
        setIsLoadingContent(false)
      }
    }

    loadPageContent()
  }, [isOpen, wiki.slug, file.filename])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setTitleError('')
    setError('')
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setError('')
  }

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setTitleError('Page title is required')
      return false
    }
    if (!content.trim()) {
      setError('Page content is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/wiki/${wiki.slug}/pages/${file.filename}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
        }),
      })

      const result = await response.json()

      if (result.success) {
        onPageUpdated({
          id: file.id,
          filename: file.filename,
          versionId: result.data.versionId
        })
        onClose()
      } else {
        setError(result.error || 'Failed to update page')
      }
    } catch (err) {
      setError('An error occurred while updating the page')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading && !isLoadingContent) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Edit Page</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading || isLoadingContent}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {isLoadingContent ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading page content...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {/* Page Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Page Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={handleTitleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter page title..."
                  disabled={isLoading}
                />
                {titleError && (
                  <p className="text-red-500 text-sm mt-1">{titleError}</p>
                )}
              </div>

              {/* Filename (readonly) */}
              <div>
                <label htmlFor="filename" className="block text-sm font-medium text-gray-700 mb-1">
                  Filename
                </label>
                <input
                  type="text"
                  id="filename"
                  value={file.filename}
                  readOnly
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600 cursor-not-allowed"
                  disabled={isLoading}
                />
              </div>

              {/* Page Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Page Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={handleContentChange}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter page content in Markdown format..."
                  disabled={isLoading}
                >
                  {content}
                </textarea>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}