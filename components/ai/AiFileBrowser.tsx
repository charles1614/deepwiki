'use client'

import React, { useState, useEffect } from 'react'
import { FolderIcon, DocumentTextIcon, ArrowLeftIcon, ArrowPathIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'
import { useAiConnection } from '@/lib/ai/AiConnectionContext'
import { preserveFileBrowserState, retrieveFileBrowserState, clearFileBrowserState } from '@/lib/ai/aiStorage'

interface AiFileBrowserProps {
  socket: any
}

interface FileItem {
  filename: string
  longname: string
  attrs: any
  isDirectory: boolean
}

export function AiFileBrowser({ socket }: AiFileBrowserProps) {
  const [currentPath, setCurrentPath] = useState('.')
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const { state: connectionState } = useAiConnection()

  // Preserve file browser state when connection is preserved
  useEffect(() => {
    if (connectionState.connectionStatus === 'preserved') {
      preserveFileBrowserState(currentPath, selectedFile, scrollPosition)
    }
  }, [connectionState.connectionStatus, currentPath, selectedFile, scrollPosition])

  // Restore file browser state on connection
  useEffect(() => {
    if (connectionState.connectionStatus === 'connected') {
      const storedState = retrieveFileBrowserState()
      if (storedState) {
        try {
          setCurrentPath(storedState.currentPath)
          setSelectedFile(storedState.selectedFile)
          setScrollPosition(storedState.scrollPosition)
          console.log('File browser state restored from storage')
        } catch (error) {
          console.error('Failed to restore file browser state:', error)
          clearFileBrowserState()
        }
      }
    }
  }, [connectionState.connectionStatus])

  useEffect(() => {
    if (!socket) return

    socket.on('sftp-list-result', ({ path, list }: { path: string, list: FileItem[] }) => {
      console.log('AiFileBrowser: sftp-list-result', { path, listLength: list.length })
      // Use the path from the server response to ensure currentPath is in sync with the file list
      setCurrentPath(path)
      setFiles(list.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1
        if (!a.isDirectory && b.isDirectory) return 1
        return a.filename.localeCompare(b.filename)
      }))
      setLoading(false)
    })

    socket.on('sftp-read-result', ({ path, content }: { path: string, content: string }) => {
      setFileContent(content)
      setLoading(false)
    })

    socket.on('sftp-error', (err: string) => {
      console.error('AiFileBrowser: sftp-error', err)
      setError(err)
      setLoading(false)
    })

    socket.on('ssh-ready', () => {
      // Load directory after connection ready
      const storedState = retrieveFileBrowserState()
      if (storedState) {
        loadDirectory(storedState.currentPath)
      } else {
        loadDirectory('.')
      }
    })

    socket.on('ssh-restored', () => {
      // Load directory after restoration
      const storedState = retrieveFileBrowserState()
      if (storedState) {
        loadDirectory(storedState.currentPath)
        if (storedState.selectedFile) {
          setSelectedFile(storedState.selectedFile)
          setLoading(true)
          socket.emit('sftp-read', storedState.selectedFile)
        }
      } else {
        loadDirectory('.')
      }
    })

    socket.on('ssh-close', () => {
      setFiles([])
      setFileContent('')
      setSelectedFile(null)
      clearFileBrowserState()
    })

    return () => {
      socket.off('sftp-list-result')
      socket.off('sftp-read-result')
      socket.off('sftp-error')
      socket.off('ssh-ready')
      socket.off('ssh-restored')
      socket.off('ssh-close')
    }
  }, [socket])

  // Handle initial load if already connected
  useEffect(() => {
    if (socket && connectionState.connectionStatus === 'connected' && files.length === 0 && !loading) {
      console.log('AiFileBrowser: Already connected on mount, loading directory')
      const storedState = retrieveFileBrowserState()
      if (storedState) {
        loadDirectory(storedState.currentPath)
        if (storedState.selectedFile) {
          setSelectedFile(storedState.selectedFile)
          setLoading(true)
          socket.emit('sftp-read', storedState.selectedFile)
        }
      } else {
        loadDirectory('.')
      }
    }
  }, [socket, connectionState.connectionStatus])

  const loadDirectory = (path: string) => {
    console.log('AiFileBrowser: loadDirectory', path)
    setLoading(true)
    setError(null)
    socket.emit('sftp-list', path)
    setCurrentPath(path)
    setSelectedFile(null)
    setFileContent('')
  }

  const handleFileClick = (file: FileItem) => {
    if (file.isDirectory) {
      const newPath = currentPath === '.' ? file.filename : `${currentPath}/${file.filename}`
      loadDirectory(newPath)
    } else {
      if (file.filename.endsWith('.md')) {
        setLoading(true)
        setError(null)
        const filePath = currentPath === '.' ? file.filename : `${currentPath}/${file.filename}`
        setSelectedFile(filePath)
        socket.emit('sftp-read', filePath)
      }
    }
  }

  const handleBack = () => {
    if (selectedFile) {
      setSelectedFile(null)
      setFileContent('')
    } else if (currentPath !== '.') {
      const parentPath = currentPath.split('/').slice(0, -1).join('/') || '.'
      loadDirectory(parentPath)
    }
  }
  const handleRefresh = () => {
    if (selectedFile) {
      setLoading(true)
      setError(null)
      socket.emit('sftp-read', selectedFile)
    } else {
      loadDirectory(currentPath)
    }
  }

  const isPublishable = () => {
    // Check if current path matches .../docs/xxx pattern
    // Filter out '.' AND empty strings (from leading/trailing slashes)
    const pathParts = currentPath.split('/').filter(p => p && p !== '.')
    const docsIndex = pathParts.lastIndexOf('docs')

    // Must find 'docs' and it must be the second to last part (parent of current dir)
    if (docsIndex === -1 || docsIndex !== pathParts.length - 2) {
      return false
    }

    // Check if index.md exists in current files
    return files.some(f => f.filename === 'index.md')
  }

  const handlePublish = async () => {
    if (!socket) return

    const pathParts = currentPath.split('/').filter(p => p && p !== '.')
    const docsIndex = pathParts.lastIndexOf('docs')
    const slug = pathParts[docsIndex + 1]

    if (!slug) return

    // Verify wiki existence (optional, but good for UX)
    try {
      const res = await fetch(`/api/wiki/${slug}`)
      const data = await res.json()

      let confirmMessage = `Are you sure you want to publish "${slug}"?`
      if (data.success) {
        confirmMessage = `Wiki "${slug}" already exists. Do you want to update it?`
      }

      if (!window.confirm(confirmMessage)) return

    } catch (error) {
      console.error('Error checking wiki:', error)
      // Continue anyway, maybe it's a new wiki
      if (!window.confirm(`Are you sure you want to publish "${slug}"?`)) return
    }

    setPublishing(true)
    setPublishStatus(null)

    try {
      // 1. Filter markdown files
      const mdFiles = files.filter(f => !f.isDirectory && f.filename.endsWith('.md'))

      if (mdFiles.length === 0) {
        throw new Error('No markdown files found to publish')
      }

      // 2. Read content of all files
      const fileContents: { filename: string, content: string }[] = []

      // We need to promisify the socket read
      const readFile = (filename: string): Promise<string> => {
        return new Promise((resolve, reject) => {
          const path = `${currentPath}/${filename}`

          // Create a one-time listener for this specific read
          const handleRead = ({ path: readPath, content }: { path: string, content: string }) => {
            if (readPath === path) {
              socket.off('sftp-read-result', handleRead)
              socket.off('sftp-error', handleError)
              resolve(content)
            }
          }

          const handleError = (err: string) => {
            socket.off('sftp-read-result', handleRead)
            socket.off('sftp-error', handleError)
            reject(new Error(err))
          }

          // Note: This might conflict with the main useEffect listeners if not careful.
          // However, since we are adding specific listeners *before* emitting, 
          // and the main listener just updates state, it should be fine.
          // Ideally we should refactor the main listener to ignore these specific reads if possible,
          // or just accept that state might flicker (which is fine as we are in publishing state).
          // Actually, the main listener updates `fileContent` state. We should probably temporarily detach it or ignore it.
          // For now, let's just use a separate event or rely on the fact that we are "publishing".

          // Better approach: The main listener is always active. We can't easily "intercept" the event 
          // without removing the main listener.
          // But we can just use the main listener!
          // We can't easily wait for it though without a custom promise wrapper that hooks into the global event stream.
          // Given the constraints and the existing code structure, let's try to use a "request-response" pattern 
          // by adding a unique ID to requests if the backend supported it, but it doesn't seem to.

          // Alternative: We can just emit 'sftp-read' and wait for 'sftp-read-result' that matches our path.
          // The main listener will ALSO fire and update `fileContent`, which might be annoying but harmless 
          // if we are showing a loading overlay.

          const onRead = (data: { path: string, content: string }) => {
            if (data.path === path) {
              cleanup()
              resolve(data.content)
            }
          }

          const onError = (err: any) => {
            cleanup()
            reject(err)
          }

          const cleanup = () => {
            socket.off('sftp-read-result', onRead)
            socket.off('sftp-error', onError)
          }

          socket.on('sftp-read-result', onRead)
          socket.on('sftp-error', onError)

          socket.emit('sftp-read', path)
        })
      }

      for (const file of mdFiles) {
        const content = await readFile(file.filename)
        fileContents.push({ filename: file.filename, content })
      }

      // 3. Send to API
      const response = await fetch('/api/wiki/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slug,
          files: fileContents
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to publish wiki')
      }

      setPublishStatus({ type: 'success', message: 'Wiki published successfully!' })

      // Clear status after 3 seconds
      setTimeout(() => setPublishStatus(null), 3000)

    } catch (error) {
      console.error('Publish error:', error)
      setPublishStatus({ type: 'error', message: error instanceof Error ? error.message : 'Failed to publish' })
    } finally {
      setPublishing(false)
    }
  }
  return (
    <div
      className="h-full flex flex-col bg-white"
      data-testid="ai-file-browser"
    >
      <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2 overflow-hidden">
          {(currentPath !== '.' || selectedFile) && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-4 w-4 text-gray-600" />
            </button>
          )}
          <h3 className="text-sm font-semibold text-gray-700 truncate">
            {selectedFile ? selectedFile : currentPath}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            title="Refresh"
            disabled={loading || publishing}
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isPublishable() && (
            <button
              onClick={handlePublish}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border shadow-sm ${publishing
                  ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-wait'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
                }`}
              title="Publish to Wiki"
              disabled={publishing}
            >
              {publishing ? (
                <>
                  <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-3.5 w-3.5" />
                  <span>Publish</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
            Error: {error}
          </div>
        )}

        {publishStatus && (
          <div className={`p-4 rounded-md mb-4 ${publishStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
            {publishStatus.message}
          </div>
        )}

        {selectedFile ? (
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={fileContent} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {files.map((file) => (
              <button
                key={file.filename}
                onClick={() => handleFileClick(file)}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md text-left transition-colors group"
              >
                {file.isDirectory ? (
                  <FolderIcon className="h-6 w-6 text-blue-400 group-hover:text-blue-500" />
                ) : (
                  <DocumentTextIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                )}
                <span className={`text-sm ${file.isDirectory ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                  {file.filename}
                </span>
              </button>
            ))}
            {files.length === 0 && !loading && !error && (
              <div className="text-center text-gray-500 py-8">
                Waiting for connection...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
