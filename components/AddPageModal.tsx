'use client'

import React, { useState } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

interface AddPageModalProps {
  wiki: Wiki
  isOpen: boolean
  onClose: () => void
  onPageCreated: (file: { id: string; filename: string }) => void
}

export function AddPageModal({ wiki, isOpen, onClose, onPageCreated }: AddPageModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')

  // Generate filename from title
  const generateFilename = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() || 'untitled'
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    setFilename(generateFilename(newTitle) + '.md')
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
      const response = await fetch(`/api/wiki/${wiki.slug}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          filename: filename
        }),
      })

      const result = await response.json()

      if (result.success) {
        onPageCreated(result.data)
        onClose()
        // Reset form
        setTitle('')
        setContent('')
        setFilename('')
      } else {
        setError(result.error || 'Failed to create page')
      }
    } catch (err) {
      setError('An error occurred while creating the page')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
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
          <h2 className="text-xl font-semibold text-gray-900">Add New Page</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

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

            {/* Generated Filename */}
            {filename && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generated Filename
                </label>
                <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                  <code className="text-sm text-gray-600">{filename}</code>
                </div>
              </div>
            )}

            {/* Page Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                Page Content <span className="text-red-500">*</span>
              </label>
              <textarea
                id="content"
                value={content}
                onChange={handleContentChange}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Enter page content in Markdown format..."
                disabled={isLoading}
              />
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
              {isLoading ? 'Creating...' : 'Create Page'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}