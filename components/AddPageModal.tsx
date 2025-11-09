'use client'

import React, { useState, useRef, useCallback } from 'react'
import { XMarkIcon, DocumentArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline'

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

type CreateMode = 'manual' | 'upload'

export function AddPageModal({ wiki, isOpen, onClose, onPageCreated }: AddPageModalProps) {
  const [mode, setMode] = useState<CreateMode>('manual')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [titleError, setTitleError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileSelect = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.md')) {
      setError('Only markdown (.md) files are allowed')
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setError('File size too large. Maximum 5MB allowed.')
      return
    }

    setUploadedFile(file)
    setError('')

    // Read file content
    try {
      const text = await file.text()
      setContent(text)
      
      // Extract title from filename or content
      const nameWithoutExt = file.name.replace(/\.md$/, '')
      const titleFromName = nameWithoutExt
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
      
      // Try to extract title from content (first H1 or frontmatter)
      let extractedTitle = titleFromName
      const h1Match = text.match(/^# (.+)$/m)
      if (h1Match) {
        extractedTitle = h1Match[1].trim()
      }

      if (!title) {
        setTitle(extractedTitle)
        setFilename(generateFilename(extractedTitle) + '.md')
      }
    } catch (err) {
      setError('Failed to read file content')
      console.error('Error reading file:', err)
    }
  }, [title])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setContent('')
    setTitle('')
    setFilename('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = (): boolean => {
    if (mode === 'upload') {
      if (!uploadedFile) {
        setError('Please select a file to upload')
        return false
      }
      if (!content.trim()) {
        setError('File content is required')
        return false
      }
    } else {
      if (!title.trim()) {
        setTitleError('Page title is required')
        return false
      }
      if (!content.trim()) {
        setError('Page content is required')
        return false
      }
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
      // Use uploaded file's name if available, otherwise use generated filename
      const finalFilename = uploadedFile ? uploadedFile.name : filename

      const response = await fetch(`/api/wiki/${wiki.slug}/pages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim() || (uploadedFile ? uploadedFile.name.replace(/\.md$/, '') : 'Untitled'),
          content: content.trim(),
          filename: finalFilename
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
        setUploadedFile(null)
        setMode('manual')
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
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
      // Reset form on close
      setTitle('')
      setContent('')
      setFilename('')
      setUploadedFile(null)
      setMode('manual')
      setError('')
      setTitleError('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
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

        {/* Mode Selection Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => {
              setMode('manual')
              setError('')
              setTitleError('')
            }}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              mode === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            disabled={isLoading}
          >
            <div className="flex items-center justify-center gap-2">
              <DocumentTextIcon className="h-5 w-5" />
              <span>Manual Entry</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('upload')
              setError('')
              setTitleError('')
            }}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              mode === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            disabled={isLoading}
          >
            <div className="flex items-center justify-center gap-2">
              <DocumentArrowUpIcon className="h-5 w-5" />
              <span>Upload File</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {mode === 'upload' ? (
              /* Upload Mode */
              <>
                {!uploadedFile ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Drag and drop a markdown file here, or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".md"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Select File
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Only .md files up to 5MB</p>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <DocumentTextIcon className="h-8 w-8 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(uploadedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        disabled={isLoading}
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Title input for uploaded files */}
                {uploadedFile && (
                  <div>
                    <label htmlFor="upload-title" className="block text-sm font-medium text-gray-700 mb-1">
                      Page Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="upload-title"
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
                )}

                {/* Generated Filename */}
                {uploadedFile && filename && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filename
                    </label>
                    <div className="flex items-center px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                      <code className="text-sm text-gray-600">{uploadedFile.name}</code>
                    </div>
                  </div>
                )}

                {/* Content preview/editor for uploaded files */}
                {uploadedFile && (
                  <div>
                    <label htmlFor="upload-content" className="block text-sm font-medium text-gray-700 mb-1">
                      Page Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="upload-content"
                      value={content}
                      onChange={handleContentChange}
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                      placeholder="File content will appear here..."
                      disabled={isLoading}
                    />
                  </div>
                )}
              </>
            ) : (
              /* Manual Mode */
              <>
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
                  />
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
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
