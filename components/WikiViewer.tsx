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
  fileName: string
  filePath: string
  fileSize: number
  contentType: string
}

interface WikiViewerProps {
  wiki: Wiki
  onBack?: () => void
}

export function WikiViewer({ wiki, onBack }: WikiViewerProps) {
  const [files, setFiles] = useState<WikiFile[]>([])
  const [selectedFile, setSelectedFile] = useState<WikiFile | null>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contentError, setContentError] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/wiki/${wiki.slug}/files`)

      if (!response.ok) {
        throw new Error('Failed to fetch wiki files')
      }

      const result = await response.json()

      if (result.success) {
        const wikiFiles = result.files || []
        setFiles(wikiFiles)

        // Auto-select index.md if available
        const indexFile = wikiFiles.find(file => file.fileName === 'index.md')
        if (indexFile) {
          setSelectedFile(indexFile)
        } else if (wikiFiles.length > 0) {
          setSelectedFile(wikiFiles[0])
        }
      } else {
        setError(result.error || 'Failed to load wiki files')
      }
    } catch (err) {
      setError('Failed to load wiki files. Please try again later.')
    } finally {
      setLoading(false)
    }
  }, [wiki.slug])

  const fetchFileContent = useCallback(async (file: WikiFile) => {
    try {
      setContentLoading(true)
      setContentError(null)

      const response = await fetch(`/api/wiki/${wiki.slug}/file/${file.fileName}`)

      if (!response.ok) {
        throw new Error('Failed to fetch file content')
      }

      const result = await response.json()

      if (result.success) {
        setContent(result.content || '')
      } else {
        setContentError(result.error || 'Failed to load wiki content')
      }
    } catch (err) {
      setContentError('Failed to load wiki content. Please try again later.')
    } finally {
      setContentLoading(false)
    }
  }, [wiki.slug])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

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
    if (error) {
      fetchFiles()
    } else if (contentError) {
      if (selectedFile) {
        fetchFileContent(selectedFile)
      }
    }
  }, [error, contentError, selectedFile, fetchFiles, fetchFileContent])

  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading wiki content...</div>
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

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <div className="lg:w-64 flex-shrink-0">
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

          {files.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">No files found in this wiki</div>
            </div>
          ) : (
            <ul className="space-y-0.5" data-testid="file-list">
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    onClick={() => handleFileSelect(file)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors
                      ${selectedFile?.id === file.id
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    data-testid={`file-${file.fileName}`}
                  >
                    {file.fileName.replace(/\.md$/, '')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-md p-6">
          {selectedFile && (
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{wiki.title}</h1>
              <div className="text-sm text-gray-500">
                Viewing: {selectedFile.fileName.replace(/\.md$/, '')}
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
              <MarkdownRenderer content={content} />
            </div>
          )}

          {!contentLoading && !contentError && !content && selectedFile && (
            <div className="text-center py-12">
              <div className="text-gray-500">No content available for {selectedFile.fileName.replace(/\.md$/, '')}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}