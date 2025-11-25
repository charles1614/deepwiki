'use client'

import React, { useState, useEffect } from 'react'
import { FolderIcon, DocumentTextIcon, ArrowLeftIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'

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

  useEffect(() => {
    if (!socket) return

    socket.on('sftp-list-result', ({ path, list }: { path: string, list: FileItem[] }) => {
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
      setError(err)
      setLoading(false)
    })

    socket.on('ssh-ready', () => {
      loadDirectory('.')
    })

    socket.on('ssh-close', () => {
      setFiles([])
      setFileContent('')
      setSelectedFile(null)
    })

    return () => {
      socket.off('sftp-list-result')
      socket.off('sftp-read-result')
      socket.off('sftp-error')
      socket.off('ssh-ready')
      socket.off('ssh-close')
    }
  }, [socket])

  const loadDirectory = (path: string) => {
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
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2 overflow-hidden">
          {(currentPath !== '.' || selectedFile) && (
            <button
              onClick={handleBack}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <h3 className="font-semibold text-gray-700 truncate">
            {selectedFile ? selectedFile : currentPath}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            title="Refresh"
            disabled={loading}
          >
            <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md mb-4">
            Error: {error}
          </div>
        )}

        {selectedFile ? (
          <div className="prose max-w-none">
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
