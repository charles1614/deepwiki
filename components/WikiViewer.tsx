'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'

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

interface WikiViewerProps {
  wiki: Wiki
  onBack?: () => void
  files?: WikiFile[]
}

export function WikiViewer({ wiki, onBack, files: initialFiles = [] }: WikiViewerProps) {
  const [selectedFile, setSelectedFile] = useState<WikiFile | null>(null)
  const [content, setContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)

  // Initialize files from props
  useEffect(() => {
    if (initialFiles.length > 0) {
      // Auto-select index.md if available
      const indexFile = initialFiles.find(file => file.filename === 'index.md')
      if (indexFile) {
        setSelectedFile(indexFile)
      } else {
        setSelectedFile(initialFiles[0])
      }
    }
  }, [initialFiles])

  const fetchFileContent = useCallback(async (file: WikiFile) => {
    try {
      setContentLoading(true)
      setContentError(null)

      // Try API route first since direct URLs might not exist
      const apiResponse = await fetch(`/api/wiki/file/${file.id}`)

      if (apiResponse.ok) {
        const result = await apiResponse.json()
        if (result.success) {
          setContent(result.content || '')
        } else {
          setContentError(result.error || 'Failed to load wiki content')
        }
      } else {
        // If API fails, try direct URL (for legacy compatibility)
        const response = await fetch(file.url)

        if (response.ok) {
          const text = await response.text()
          setContent(text)
        } else {
          setContentError('Failed to load wiki content')
        }
      }
    } catch (err) {
      setContentError('Failed to load wiki content. Please try again later.')
    } finally {
      setContentLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile)
    }
  }, [selectedFile, fetchFileContent])

  const handleFileSelect = useCallback((file: WikiFile) => {
    setSelectedFile(file)
    setContentError(null)
  }, [])

  const handleRetry = useCallback(() => {
    if (contentError && selectedFile) {
      fetchFileContent(selectedFile)
    }
  }, [contentError, selectedFile, fetchFileContent])

  // Sort files: index and overview first, then others alphabetically
  const sortedFiles = React.useMemo(() => {
    const files = [...initialFiles]
    const indexFile = files.find(file => {
      const name = file.filename.replace(/\.md$/, '').toLowerCase()
      return name === 'index'
    })
    const overviewFile = files.find(file => {
      const name = file.filename.replace(/\.md$/, '').toLowerCase()
      return name === 'overview'
    })
    
    const otherFiles = files.filter(file => {
      const name = file.filename.replace(/\.md$/, '').toLowerCase()
      return name !== 'index' && name !== 'overview'
    }).sort((a, b) => {
      const nameA = a.filename.replace(/\.md$/, '').toLowerCase()
      const nameB = b.filename.replace(/\.md$/, '').toLowerCase()
      return nameA.localeCompare(nameB)
    })
    
    const sorted: WikiFile[] = []
    if (indexFile) sorted.push(indexFile)
    if (overviewFile) sorted.push(overviewFile)
    sorted.push(...otherFiles)
    
    return sorted
  }, [initialFiles])

  
  if (initialFiles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">No files found in this wiki</div>
        {onBack && (
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            ← Back to Wikis
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full">
      {/* Sidebar */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Files</h3>
            {onBack && (
              <button
                onClick={onBack}
                className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                aria-label="Back to wikis"
              >
                ← Back
              </button>
            )}
          </div>

          {initialFiles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">No files found in this wiki</div>
            </div>
          ) : (
            <ul className="space-y-0.5" data-testid="file-list">
              {sortedFiles.map((file) => (
                <li key={file.id}>
                  <button
                    onClick={() => handleFileSelect(file)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors
                      ${selectedFile?.id === file.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    data-testid={`file-${file.filename}`}
                  >
                    {file.filename.replace(/\.md$/, '')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-w-0 w-full">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full max-w-full">
          {selectedFile && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{wiki.title}</h1>
              <div className="text-sm text-gray-500">
                Viewing: {selectedFile.filename.replace(/\.md$/, '')}
              </div>
            </div>
          )}

          {contentLoading && (
            <div className="flex justify-center items-center py-12" data-testid="content-loading">
              <div className="text-gray-500">Loading content...</div>
            </div>
          )}

          {contentError && (
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">{contentError}</div>
              <button
                onClick={handleRetry}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!contentLoading && !contentError && content && (
            <div className="markdown-content">
              <MarkdownRenderer content={content} theme="handdrawn" />
            </div>
          )}

          {!contentLoading && !contentError && !content && selectedFile && (
            <div className="text-center py-12">
              <div className="text-gray-500">No content available for {selectedFile.filename.replace(/\.md$/, '')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}