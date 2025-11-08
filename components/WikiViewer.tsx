'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
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

// Global cache for file contents (shared across all WikiViewer instances)
const fileContentCache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache TTL
const PREFETCH_DELAY = 300 // 300ms delay before prefetch on hover

export function WikiViewer({ wiki, onBack, files: initialFiles = [] }: WikiViewerProps) {
  const searchParams = useSearchParams()
  const [selectedFile, setSelectedFile] = useState<WikiFile | null>(null)
  const [content, setContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [prefetchingFile, setPrefetchingFile] = useState<string | null>(null)

  // Initialize files from props with priority: URL param > index > first file
  useEffect(() => {
    if (initialFiles.length > 0) {
      // Get file name from URL parameter
      const urlFileParam = searchParams?.get('file')
      
      let fileToSelect: WikiFile | null = null
      
      // Priority 1: URL parameter file
      if (urlFileParam) {
        const normalizedParam = urlFileParam.toLowerCase().replace(/\.md$/, '')
        fileToSelect = initialFiles.find(file => {
          const name = file.filename.replace(/\.md$/, '').toLowerCase()
          return name === normalizedParam
        }) || null
      }
      
      // Priority 2: index.md
      if (!fileToSelect) {
        fileToSelect = initialFiles.find(file => {
          const name = file.filename.replace(/\.md$/, '').toLowerCase()
          return name === 'index'
        }) || null
      }
      
      // Priority 3: First file
      if (!fileToSelect) {
        fileToSelect = initialFiles[0]
      }
      
      if (fileToSelect) {
        setSelectedFile(fileToSelect)
      }
    }
  }, [initialFiles, searchParams])

  const fetchFileContent = useCallback(async (file: WikiFile, useCache = true) => {
    // Check cache first
    if (useCache) {
      const cached = fileContentCache.get(file.id)
      if (cached && Date.now() - cached.timestamp < CACHE_TTL && cached.content !== undefined && cached.content !== null) {
        setContent(cached.content)
        setContentLoading(false)
        setContentError(null)
        return
      }
    }

    try {
      setContentLoading(true)
      setContentError(null)

      // Try alternative route first (slug + filename) as it's more reliable
      // Fallback to fileId route if slug/filename not available
      let apiResponse: Response | null = null
      let usedAlternativeRoute = false

      if (wiki.slug && file.filename) {
        try {
          console.log(`Fetching file content via slug route: slug=${wiki.slug}, filename=${file.filename}`)
          apiResponse = await fetch(`/api/wiki/${wiki.slug}/file/${encodeURIComponent(file.filename)}`, {
            cache: 'default'
          })
          usedAlternativeRoute = true
        } catch (altErr) {
          console.warn('Alternative route failed, trying fileId route:', altErr)
        }
      }

      // Fallback to fileId route
      if (!apiResponse || !apiResponse.ok) {
        console.log(`Fetching file content via fileId route: fileId=${file.id}, filename=${file.filename}`)
        apiResponse = await fetch(`/api/wiki/file/${file.id}`, {
          cache: 'default'
        })
        usedAlternativeRoute = false
      }

      if (apiResponse.ok) {
        const result = await apiResponse.json()
        if (result.success && result.content !== undefined) {
          const fileContent = result.content || ''
          // Store in cache
          fileContentCache.set(file.id, {
            content: fileContent,
            timestamp: Date.now()
          })
          setContent(fileContent)
          if (usedAlternativeRoute) {
            console.log(`Successfully loaded file via slug route: ${file.filename}`)
          }
        } else {
          const errorMsg = result.error || 'Failed to load wiki content'
          console.error('API returned error:', errorMsg, result, { fileId: file.id, filename: file.filename, route: usedAlternativeRoute ? 'slug' : 'fileId' })
          setContentError(errorMsg)
        }
      } else {
        // Try to parse error response
        let errorMessage = `Failed to load wiki content (HTTP ${apiResponse.status})`
        let errorResult: any = null
        try {
          const responseText = await apiResponse.text()
          if (responseText) {
            errorResult = JSON.parse(responseText)
            if (errorResult && errorResult.error) {
              errorMessage = errorResult.error
            }
          }
          console.error('API error response:', { 
            status: apiResponse.status, 
            statusText: apiResponse.statusText,
            responseText,
            parsed: errorResult,
            fileId: file.id, 
            filename: file.filename 
          })
        } catch (parseErr) {
          // If JSON parsing fails, use default error message
          console.error('Failed to parse error response:', parseErr, { 
            fileId: file.id, 
            filename: file.filename, 
            status: apiResponse.status,
            statusText: apiResponse.statusText
          })
        }
        
        // If both API routes failed, try direct URL (for legacy compatibility)
        if (file.url) {
          try {
            const response = await fetch(file.url, {
              cache: 'default'
            })

            if (response.ok) {
              const text = await response.text()
              // Store in cache
              fileContentCache.set(file.id, {
                content: text,
                timestamp: Date.now()
              })
              setContent(text)
            } else {
              console.error('Direct URL fetch failed:', response.status, response.statusText)
              setContentError(`Failed to load wiki content (HTTP ${response.status})`)
            }
          } catch (urlErr) {
            console.error('Direct URL fetch error:', urlErr)
            setContentError('Failed to load wiki content from direct URL')
          }
        } else {
          console.error('API failed and no direct URL available:', apiResponse.status, apiResponse.statusText)
          setContentError(errorMessage)
        }
      }
    } catch (err) {
      console.error('Fetch file content error:', err)
      setContentError('Failed to load wiki content. Please try again later.')
    } finally {
      setContentLoading(false)
    }
  }, [])

  // Background prefetch function - loads file content and stores in cache
  const prefetchFileContent = useCallback(async (file: WikiFile) => {
    // Skip if already in cache
    const cached = fileContentCache.get(file.id)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return true
    }

    // Skip if currently loading this file
    if (selectedFile?.id === file.id && contentLoading) {
      return false
    }

    try {
      setPrefetchingFile(file.id)
      // Use low priority fetch with cache
      const apiResponse = await fetch(`/api/wiki/file/${file.id}`, {
        cache: 'default'
      })

      if (apiResponse.ok) {
        const result = await apiResponse.json()
        if (result.success && result.content) {
          // Store in cache for future use
          fileContentCache.set(file.id, {
            content: result.content,
            timestamp: Date.now()
          })
          return true
        }
      }
    } catch (err) {
      // Silently fail for prefetch - don't show errors
    } finally {
      setPrefetchingFile(null)
    }
    return false
  }, [selectedFile, contentLoading])

  // Handle file hover for prefetching - use ref to track timeouts
  const hoverTimeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleFileHover = useCallback((file: WikiFile) => {
    // Only prefetch if not already cached and not currently selected
    if (file.id === selectedFile?.id) {
      return
    }

    const cached = fileContentCache.get(file.id)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return
    }

    // Clear any existing timeout for this file
    const existingTimeout = hoverTimeoutsRef.current.get(file.id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Delay prefetch to avoid unnecessary requests on quick hovers
    const timeoutId = setTimeout(() => {
      hoverTimeoutsRef.current.delete(file.id)
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          prefetchFileContent(file)
        }, { timeout: 1000 })
      } else {
        prefetchFileContent(file)
      }
    }, PREFETCH_DELAY)

    hoverTimeoutsRef.current.set(file.id, timeoutId)
  }, [selectedFile, prefetchFileContent])

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      hoverTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      hoverTimeoutsRef.current.clear()
    }
  }, [])

  // Main content loading effect
  useEffect(() => {
    if (selectedFile) {
      fetchFileContent(selectedFile)
    }
  }, [selectedFile, fetchFileContent])

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

  // Background prefetch effect - runs after main content is loaded
  useEffect(() => {
    if (!contentLoading && content && selectedFile && initialFiles.length > 0) {
      // Prefetch other commonly accessed files in the background
      // Use requestIdleCallback if available, otherwise use setTimeout
      const schedulePrefetch = () => {
        const filesToPrefetch: WikiFile[] = []
        
        // Find overview file if it exists and is not the current file
        const overviewFile = sortedFiles.find(file => {
          const name = file.filename.replace(/\.md$/, '').toLowerCase()
          return name === 'overview' && file.id !== selectedFile.id
        })
        if (overviewFile) {
          filesToPrefetch.push(overviewFile)
        }
        
        // Find index file if it exists and is not the current file
        const indexFile = sortedFiles.find(file => {
          const name = file.filename.replace(/\.md$/, '').toLowerCase()
          return name === 'index' && file.id !== selectedFile.id
        })
        if (indexFile) {
          filesToPrefetch.push(indexFile)
        }
        
        // Prefetch files with low priority
        filesToPrefetch.forEach((file, index) => {
          // Stagger prefetch requests to avoid overwhelming the server
          setTimeout(() => {
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              requestIdleCallback(() => {
                prefetchFileContent(file)
              }, { timeout: 2000 })
            } else {
              // Fallback for browsers without requestIdleCallback
              prefetchFileContent(file)
            }
          }, index * 500) // 500ms delay between each prefetch
        })
      }

      // Wait a bit before starting prefetch to ensure main content is fully rendered
      const timeoutId = setTimeout(schedulePrefetch, 1000)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [contentLoading, content, selectedFile, initialFiles, sortedFiles, prefetchFileContent])

  const handleFileSelect = useCallback((file: WikiFile) => {
    setSelectedFile(file)
    setContentError(null)
  }, [])

  const handleRetry = useCallback(() => {
    if (contentError && selectedFile) {
      fetchFileContent(selectedFile)
    }
  }, [contentError, selectedFile, fetchFileContent])

  
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
              {sortedFiles.map((file) => {
                const isCached = fileContentCache.has(file.id)
                const isPrefetching = prefetchingFile === file.id
                return (
                  <li key={file.id}>
                    <button
                      onClick={() => handleFileSelect(file)}
                      onMouseEnter={() => handleFileHover(file)}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors relative
                        ${selectedFile?.id === file.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      data-testid={`file-${file.filename}`}
                    >
                      <span>{file.filename.replace(/\.md$/, '')}</span>
                      {isCached && selectedFile?.id !== file.id && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400" title="Cached">
                          ●
                        </span>
                      )}
                      {isPrefetching && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 animate-pulse" title="Loading...">
                          ○
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
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
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            {selectedFile && (
              <button
                onClick={() => {
                  // Clear cache for this file and retry
                  fileContentCache.delete(selectedFile.id)
                  fetchFileContent(selectedFile, false)
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                Clear Cache & Retry
              </button>
            )}
          </div>
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