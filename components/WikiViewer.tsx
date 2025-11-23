'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'
import { AddPageModal } from '@/components/AddPageModal'
import { EditPageModal } from '@/components/EditPageModal'
import { DeletePageModal } from '@/components/DeletePageModal'
import { VersionHistoryModal } from '@/components/VersionHistoryModal'
import { PrivacyToggle } from '@/components/wiki/PrivacyToggle'
import { useBreadcrumbRightContent } from '@/components/layout/BreadcrumbsRightContent'
import { useSession } from 'next-auth/react'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
  isPublic: boolean
  ownerId?: string
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
  onFilesRefresh?: () => void
}

// Global cache for file contents (shared across all WikiViewer instances)
const fileContentCache = new Map<string, { content: string; timestamp: number }>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes cache TTL

export const resetWikiViewerCache = () => {
  fileContentCache.clear()
}

const PREFETCH_DELAY = 300 // 300ms delay before prefetch on hover

export function WikiViewer({ wiki, onBack, files: initialFiles = [], onFilesRefresh }: WikiViewerProps) {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { setContent: setBreadcrumbRightContent } = useBreadcrumbRightContent()

  // Privacy state
  const [currentPrivacy, setCurrentPrivacy] = useState(wiki.isPublic)

  // Check if user is owner
  const isOwner = session?.user?.id === wiki.ownerId
  const [selectedFile, setSelectedFile] = useState<WikiFile | null>(null)
  const [content, setContent] = useState<string>('')
  const [contentLoading, setContentLoading] = useState(false)
  const [contentError, setContentError] = useState<string | null>(null)
  const [prefetchingFile, setPrefetchingFile] = useState<string | null>(null)
  const [isManageMode, setIsManageMode] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isAddPageModalOpen, setIsAddPageModalOpen] = useState(false)
  const [isEditPageModalOpen, setIsEditPageModalOpen] = useState(false)
  const [fileToEdit, setFileToEdit] = useState<WikiFile | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [filesToDelete, setFilesToDelete] = useState<WikiFile[]>([])
  const [isVersionHistoryModalOpen, setIsVersionHistoryModalOpen] = useState(false)
  const [fileForVersionHistory, setFileForVersionHistory] = useState<WikiFile | null>(null)

  // In-line editing state
  const [isEditMode, setIsEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState<string>('')
  const [editContent, setEditContent] = useState<string>('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  // In-line editing handlers - defined early for use in useEffect
  const handleStartEdit = useCallback(() => {
    if (!selectedFile) return

    // Initialize edit state with current content
    setEditTitle(selectedFile.originalName.replace(/\.md$/, ''))
    setEditContent(content)
    setIsEditMode(true)
    setIsPreviewMode(false)
    setHasUnsavedChanges(false)
    setSaveError(null)
  }, [selectedFile, content])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedFile || !editTitle.trim() || !editContent.trim()) {
      setSaveError('Title and content are required')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const response = await fetch(`/api/wiki/${wiki.slug}/pages/${selectedFile.filename}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          content: editContent.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save page')
      }

      const result = await response.json()

      // Clear cache for this file to force fresh fetch on next load
      fileContentCache.delete(selectedFile.id)

      // Update the content and cache with new content
      const savedContent = editContent.trim()
      setContent(savedContent)
      fileContentCache.set(selectedFile.id, {
        content: savedContent,
        timestamp: Date.now()
      })

      // Exit edit mode
      setIsEditMode(false)
      setHasUnsavedChanges(false)
      setSaveError(null)

      // Show success feedback (optional - could add toast notification)
      console.log('Page saved successfully:', result.data)

    } catch (error) {
      console.error('Failed to save page:', error)
      setSaveError(error instanceof Error ? error.message : 'Failed to save page')
    } finally {
      setIsSaving(false)
    }
  }, [selectedFile, wiki.slug, editTitle, editContent])

  const handleCancelEdit = useCallback(() => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        setIsEditMode(false)
        setHasUnsavedChanges(false)
        setSaveError(null)
      }
    } else {
      setIsEditMode(false)
      setSaveError(null)
    }
  }, [hasUnsavedChanges])

  // Keyboard shortcuts for editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return

      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasUnsavedChanges && !isSaving) {
          handleSaveEdit()
        }
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        e.preventDefault()
        handleCancelEdit()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isEditMode, hasUnsavedChanges, isSaving, handleSaveEdit, handleCancelEdit])

  const fetchFileContent = useCallback(async (file: WikiFile, useCache = true) => {
    if (!file) return

    // Check cache first
    if (useCache && fileContentCache.has(file.id)) {
      const cached = fileContentCache.get(file.id)
      // Cache for 5 minutes
      if (Date.now() - cached!.timestamp < CACHE_TTL) {
        setContent(cached!.content)
        return
      }
    }

    setContentLoading(true)
    setContentError(null)

    try {
      // Try to fetch by slug/filename first (cleaner URLs)
      let apiResponse: Response
      let usedAlternativeRoute = false

      try {
        apiResponse = await fetch(`/api/wiki/${wiki.slug}/file/${encodeURIComponent(file.filename)}`, {
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        usedAlternativeRoute = true
      } catch (e) {
        // Fallback to ID-based route
        apiResponse = await fetch(`/api/wiki/file/${file.id}`)
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
        } else {
          const errorMsg = result.error || 'Failed to load wiki content'
          console.error('API returned error:', errorMsg)
          setContentError(errorMsg)
        }
      } else {
        // If slug route failed with 404, try ID route
        if (usedAlternativeRoute && apiResponse.status === 404) {
          try {
            const fallbackResponse = await fetch(`/api/wiki/file/${file.id}`)
            if (fallbackResponse.ok) {
              const result = await fallbackResponse.json()
              if (result.success && result.content !== undefined) {
                const fileContent = result.content || ''
                fileContentCache.set(file.id, {
                  content: fileContent,
                  timestamp: Date.now()
                })
                setContent(fileContent)
                return
              }
            }
          } catch (e) {
            // Ignore fallback error, throw original
          }
        }
        throw new Error('Failed to load wiki content')
      }
    } catch (error) {
      console.error('Error fetching file content:', error)
      setContentError('Failed to load content. Please try again later.')
    } finally {
      setContentLoading(false)
    }
  }, [wiki.slug])

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
      // Use low priority fetch, but still bypass cache to get fresh content
      const apiResponse = await fetch(`/api/wiki/file/${file.id}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
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
            className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
          >
            ← Back to Wikis
          </button>
        )}
      </div>
    )
  }

  // Toggle manage mode
  const toggleManageMode = useCallback(() => {
    setIsManageMode(prev => !prev)
    setSelectedFiles(new Set()) // Clear selection when toggling
  }, [])

  // Set Manage button and privacy controls in breadcrumb
  useEffect(() => {
    const breadcrumbContent = (
      <div className="flex items-center gap-2">
        {/* Privacy toggle - only show to owners */}
        {isOwner && (
          <PrivacyToggle
            wikiSlug={wiki.slug}
            currentPrivacy={currentPrivacy}
            isOwner={isOwner}
            onPrivacyChange={(newPrivacy) => setCurrentPrivacy(newPrivacy)}
          />
        )}

        {/* Privacy indicator - show to everyone */}
        {!isOwner && (
          <div
            data-testid="privacy-indicator"
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              currentPrivacy
                ? 'bg-green-100 text-green-800 border border-green-200'
                : 'bg-gray-100 text-gray-800 border border-gray-200'
            }`}
          >
            <span className="mr-1">
              {currentPrivacy ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            <span data-testid="privacy-status">
              {currentPrivacy ? 'Public' : 'Private'}
            </span>
          </div>
        )}

        {/* Manage button - only show to owners */}
        {isOwner && (
          <button
            onClick={toggleManageMode}
            className={isManageMode
              ? "text-red-600 hover:text-red-800 px-3 py-1 hover:bg-red-50 rounded transition-colors"
              : "text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
            }
          >
            {isManageMode ? 'Exit Manage' : 'Manage'}
          </button>
        )}
      </div>
    )
    setBreadcrumbRightContent(breadcrumbContent)

    // Cleanup: clear breadcrumb content when component unmounts
    return () => {
      setBreadcrumbRightContent(null)
    }
  }, [isManageMode, setBreadcrumbRightContent, toggleManageMode, isOwner, wiki.slug, currentPrivacy])

  // Handle file selection for bulk operations
  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles)
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId)
    } else {
      newSelection.add(fileId)
    }
    setSelectedFiles(newSelection)
  }

  // Handle page creation
  const handleAddPage = () => {
    setIsAddPageModalOpen(true)
  }

  const handlePageCreated = useCallback(async (newFile: { id: string; filename: string }) => {
    // Refresh the file list by calling the parent's refresh function
    if (onFilesRefresh) {
      onFilesRefresh()
    } else {
      // Fallback: use router refresh
      router.refresh()
    }
  }, [router, onFilesRefresh])

  // Handle page editing
  const handleEditPage = (file: WikiFile) => {
    setFileToEdit(file)
    setIsEditPageModalOpen(true)
  }

  // Handle version history viewing
  const handleViewVersionHistory = (file: WikiFile) => {
    setFileForVersionHistory(file)
    setIsVersionHistoryModalOpen(true)
  }

  const handlePageUpdated = (updatedFile: { id: string; filename: string; versionId: string }) => {
    // Close modal and refresh the current page content
    setIsEditPageModalOpen(false)
    setFileToEdit(null)

    // If we're viewing the edited file, refresh its content
    if (selectedFile?.id === updatedFile.id) {
      handleFileSelect(selectedFile)
    }
  }

  // Handle page deletion
  const handleDeleteSelected = () => {
    const files = selectedFiles.size > 0
      ? sortedFiles.filter(file => selectedFiles.has(file.id))
      : []

    if (files.length > 0) {
      setFilesToDelete(files)
      setIsDeleteModalOpen(true)
    }
  }

  const handlePageDeleted = (deletedFileIds: string[]) => {
    // Close delete modal
    setIsDeleteModalOpen(false)
    setFilesToDelete([])
    setSelectedFiles(new Set())

    // If we're viewing a deleted file, clear selection
    if (selectedFile && deletedFileIds.includes(selectedFile.id)) {
      setSelectedFile(null)
      setContent('')
      setContentError(null)
    }
  }


  const handleContentChange = (newContent: string) => {
    setEditContent(newContent)
    setHasUnsavedChanges(newContent !== content)
  }

  const handleTitleChange = (newTitle: string) => {
    setEditTitle(newTitle)
    setHasUnsavedChanges(newTitle !== selectedFile?.originalName.replace(/\.md$/, '') || editContent !== content)
  }

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode)
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 w-full">
        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-4">
            {/* Header Section - Two rows for better spacing */}
            <div className="mb-4 space-y-2">
              {/* First row: Title and selection count */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-900">Files</h3>
                  {isManageMode && (
                    <span className="text-sm text-gray-500">
                      ({selectedFiles.size} selected)
                    </span>
                  )}
                </div>
                {onBack && (
                  <button
                    onClick={onBack}
                    className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors text-sm"
                    aria-label="Back to wikis"
                  >
                    ← Back
                  </button>
                )}
              </div>

              {/* Second row: Action buttons (only shown in manage mode) */}
              {isManageMode && (
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedFiles.size > 0 ? (
                    <button
                      onClick={handleDeleteSelected}
                      className="text-red-600 hover:text-red-800 px-3 py-1 hover:bg-red-50 rounded transition-colors text-sm"
                    >
                      Delete Selected ({selectedFiles.size})
                    </button>
                  ) : (
                    <button
                      onClick={handleAddPage}
                      className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors text-sm"
                    >
                      + Add Page
                    </button>
                  )}
                </div>
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
                  const isSelected = selectedFiles.has(file.id)

                  return (
                    <li key={file.id}>
                      <div className={`flex items-center gap-2 w-full p-1 rounded transition-colors ${isManageMode && isSelected ? 'bg-blue-50' : ''
                        }`}>
                        {isManageMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFileSelection(file.id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                            data-testid={`checkbox-${file.id}`}
                          />
                        )}
                        <button
                          onClick={() => isManageMode ? toggleFileSelection(file.id) : handleFileSelect(file)}
                          onMouseEnter={() => !isManageMode && handleFileHover(file)}
                          className={`flex-1 text-left px-3 py-1.5 rounded text-sm transition-all relative
                          ${selectedFile?.id === file.id && !isManageMode
                              ? 'bg-blue-100 text-blue-700 font-medium'
                              : isManageMode && isSelected
                                ? 'bg-blue-100 text-blue-700 font-medium border border-blue-300'
                                : 'hover:bg-gray-100 text-gray-700'
                            }`}
                          data-testid={`file-${file.filename}`}
                        >
                          <span>{file.filename.replace(/\.md$/, '')}</span>
                          {isCached && selectedFile?.id !== file.id && !isManageMode && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400" title="Cached">
                              ●
                            </span>
                          )}
                          {isPrefetching && selectedFile?.id !== file.id && !isManageMode && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-400 animate-pulse" title="Loading...">
                              ○
                            </span>
                          )}
                        </button>
                        {isManageMode && (
                          <>
                            <button
                              onClick={() => handleEditPage(file)}
                              className={`p-1.5 rounded transition-colors ${isSelected
                                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-100'
                                : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                              title="Edit page"
                              data-testid={`edit-${file.id}`}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleViewVersionHistory(file)}
                              className={`p-1.5 rounded transition-colors ${isSelected
                                ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-100'
                                : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'
                                }`}
                              title="View version history"
                              data-testid={`history-${file.id}`}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
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
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => handleTitleChange(e.target.value)}
                          className="text-2xl font-bold text-gray-900 bg-transparent border-b-2 border-blue-500 focus:outline-none focus:border-blue-600 w-full max-w-md"
                          placeholder="Page title"
                        />
                      ) : (
                        wiki.title
                      )}
                    </h1>
                    <div className="text-sm text-gray-500">
                      {isEditMode ? 'Editing:' : 'Viewing:'} {selectedFile.filename.replace(/\.md$/, '')}
                    </div>
                  </div>

                  {/* Edit/Preview Controls */}
                  <div className="flex items-center gap-2">
                    {!isEditMode ? (
                      <button
                        onClick={handleStartEdit}
                        data-testid="edit-button"
                        className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors flex items-center gap-2"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    ) : (
                      <>
                        {/* Edit/Preview Toggle */}
                        <button
                          onClick={togglePreview}
                          data-testid="preview-toggle"
                          className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isSaving}
                        >
                          {isPreviewMode ? (
                            <>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              Preview
                            </>
                          )}
                        </button>

                        {/* Cancel Button */}
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          data-testid="cancel-edit"
                          className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>

                        {/* Save Button */}
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSaving || !hasUnsavedChanges}
                          data-testid="save-edit"
                          className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? (
                            <>
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Save Error */}
                {saveError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-red-700 text-sm">{saveError}</div>
                  </div>
                )}

                {/* Unsaved Changes Indicator */}
                {isEditMode && hasUnsavedChanges && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="text-yellow-700 text-sm">You have unsaved changes</div>
                  </div>
                )}
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
                    className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
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
                      className="text-gray-600 hover:text-gray-800 px-3 py-1 hover:bg-gray-50 rounded transition-colors"
                    >
                      Clear Cache & Retry
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Content Display/Edit Area */}
            {!contentLoading && !contentError && content && (
              <div className="markdown-content" data-testid="wiki-content">
                {isEditMode ? (
                  isPreviewMode ? (
                    /* Preview Mode */
                    <div className="border rounded-md p-4 bg-gray-50">
                      <MarkdownRenderer content={editContent} theme="handwritten" />
                    </div>
                  ) : (
                    /* Edit Mode */
                    <textarea
                      value={editContent}
                      onChange={(e) => handleContentChange(e.target.value)}
                      className="w-full h-96 p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-y"
                      placeholder="Enter your markdown content here..."
                      data-testid="content-textarea"
                    />
                  )
                ) : (
                  /* View Mode */
                  <MarkdownRenderer content={content} theme="handwritten" />
                )}
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

      {/* Add Page Modal */}
      <AddPageModal
        wiki={wiki}
        isOpen={isAddPageModalOpen}
        onClose={() => setIsAddPageModalOpen(false)}
        onPageCreated={handlePageCreated}
      />

      {/* Edit Page Modal */}
      {fileToEdit && (
        <EditPageModal
          wiki={wiki}
          file={fileToEdit}
          isOpen={isEditPageModalOpen}
          onClose={() => {
            setIsEditPageModalOpen(false)
            setFileToEdit(null)
          }}
          onPageUpdated={handlePageUpdated}
        />
      )}

      {/* Delete Page Modal */}
      <DeletePageModal
        wiki={wiki}
        files={filesToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setFilesToDelete([])
        }}
        onPageDeleted={handlePageDeleted}
      />

      {/* Version History Modal */}
      {fileForVersionHistory && (
        <VersionHistoryModal
          wiki={wiki}
          file={fileForVersionHistory}
          isOpen={isVersionHistoryModalOpen}
          onClose={() => {
            setIsVersionHistoryModalOpen(false)
            setFileForVersionHistory(null)
          }}
        />
      )}
    </div>
  )
}