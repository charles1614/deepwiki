'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressBar } from '@/components/ui/ProgressBar'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
}

interface FileProgress {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

interface EnhancedWikiUploadProps {
  onUploadSuccess: (wiki: Wiki) => void
}

export function EnhancedWikiUpload({ onUploadSuccess }: EnhancedWikiUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles(selectedFiles)

    // Initialize progress tracking
    const progress = selectedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const
    }))
    setFileProgress(progress)

    setError(null)
    setUploadStatus('idle')
    setOverallProgress(0)
  }, [])

  const validateFiles = useCallback(() => {
    if (files.length === 0) {
      setError('Please select at least one file.')
      return false
    }

    // Check if index.md is included
    const hasIndexMd = files.some(file => file.name === 'index.md')
    if (!hasIndexMd) {
      setError('index.md file is required.')
      return false
    }

    // Validate file types (only markdown files)
    const nonMarkdownFiles = files.filter(file => !file.name.endsWith('.md'))
    if (nonMarkdownFiles.length > 0) {
      setError('Only markdown (.md) files are allowed.')
      return false
    }

    // Check total size (10MB limit)
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (totalSize > maxSize) {
      setError('File size too large')
      return false
    }

    return true
  }, [files])

  const updateFileProgress = useCallback((fileIndex: number, progress: number, status: FileProgress['status'], error?: string) => {
    setFileProgress(prev => {
      const updated = [...prev]
      if (updated[fileIndex]) {
        updated[fileIndex] = { ...updated[fileIndex], progress, status, error }
      }
      return updated
    })

    // Calculate overall progress
    setFileProgress(current => {
      const totalProgress = current.reduce((sum, fp) => sum + fp.progress, 0)
      const overall = totalProgress / current.length
      setOverallProgress(overall)
      return current
    })
  }, [])

  const handleUpload = useCallback(async () => {
    setError(null)
    setCancelled(false)

    if (!validateFiles()) {
      return
    }

    setUploading(true)
    setUploadStatus('uploading')

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      // Custom fetch with progress tracking using XMLHttpRequest
      const uploadPromise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100

            // Update all files progress (since we're uploading them together)
            fileProgress.forEach((_, index) => {
              updateFileProgress(index, progress, 'uploading')
            })
          }
        })

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText)
              resolve(result)
            } catch (e) {
              reject(new Error('Invalid response from server'))
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        })

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'))
        })

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload cancelled'))
        })

        // Open and send request
        xhr.open('POST', '/api/wiki/upload')
        xhr.setRequestHeader('Accept', 'application/json')

        // Handle cancellation
        if (abortControllerRef.current) {
          abortControllerRef.current.signal.addEventListener('abort', () => {
            xhr.abort()
          })
        }

        xhr.send(formData)
      })

      const result = await uploadPromise as any

      if (result.success) {
        // Mark all files as completed
        fileProgress.forEach((_, index) => {
          updateFileProgress(index, 100, 'completed')
        })

        setUploadStatus('processing')
        setOverallProgress(100)

        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000))

        setUploadStatus('completed')
        onUploadSuccess(result.wiki)
        setFiles([])
        setFileProgress([])

        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        throw new Error(result.error || 'Upload failed.')
      }
    } catch (err: any) {
      if (err.message === 'Upload cancelled') {
        setUploadStatus('idle')
        setOverallProgress(0)
        fileProgress.forEach((_, index) => {
          updateFileProgress(index, 0, 'pending')
        })
      } else {
        setUploadStatus('error')
        setError(err.message || 'Upload failed. Please try again.')

        // Mark files as failed
        fileProgress.forEach((_, index) => {
          updateFileProgress(index, 0, 'error', err.message)
        })
      }
    } finally {
      setUploading(false)
      abortControllerRef.current = null
    }
  }, [files, validateFiles, fileProgress, updateFileProgress, onUploadSuccess])

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setCancelled(true)
    }
  }, [])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setFileProgress(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }, [])

  const retryUpload = useCallback(() => {
    setError(null)
    setUploadStatus('idle')
    setOverallProgress(0)
    fileProgress.forEach((_, index) => {
      updateFileProgress(index, 0, 'pending')
    })
  }, [fileProgress, updateFileProgress])

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Wiki Files</h2>

      <div className="space-y-6">
        {/* File Input */}
        <div>
          <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
            Select Markdown Files
          </label>
          <input
            ref={fileInputRef}
            id="file-input"
            data-testid="file-input"
            type="file"
            multiple
            accept=".md"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed
              cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select multiple .md files. index.md is required.
          </p>
        </div>

        {/* File List with Progress */}
        {files.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Selected Files: {files.length} files
            </h3>
            <div className="space-y-3">
              {fileProgress.map((fp, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {fp.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({(fp.file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {fp.status === 'error' && (
                        <span className="text-xs text-red-500" data-testid={`file-error-${fp.file.name}`}>
                          {fp.error}
                        </span>
                      )}
                      {!uploading && (
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 text-sm font-medium"
                          data-testid={`remove-file-${index}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  {uploading && (
                    <div className="w-full">
                      <ProgressBar
                        progress={fp.progress}
                        status={fp.status === 'error' ? 'error' : 'uploading'}
                        showPercentage={true}
                        className="text-xs"
                        message={
                          fp.status === 'uploading' ? 'Uploading...' :
                          fp.status === 'completed' ? 'Completed' :
                          fp.status === 'error' ? 'Failed' : 'Pending'
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Progress */}
        {uploading && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4" data-testid="upload-progress">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Overall Upload Progress
            </h3>
            <ProgressBar
              progress={overallProgress}
              status={uploadStatus}
              showPercentage={true}
              message={
                uploadStatus === 'uploading' ? `Uploading ${files.length} files...` :
                uploadStatus === 'processing' ? 'Processing uploaded files...' :
                uploadStatus === 'completed' ? 'Upload completed successfully!' :
                uploadStatus === 'error' ? 'Upload failed' : ''
              }
            />

            {uploading && !cancelled && (
              <button
                onClick={cancelUpload}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium"
                data-testid="cancel-upload"
              >
                Cancel Upload
              </button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded" data-testid="error-message">
            <p className="font-medium">{error}</p>
            {uploadStatus === 'error' && (
              <button
                onClick={retryUpload}
                className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                data-testid="retry-upload"
              >
                Retry Upload
              </button>
            )}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                     font-medium text-base"
          data-testid="upload-button"
        >
          {uploading ? 'Uploading Files...' : 'Upload Wiki'}
        </button>
      </div>
    </div>
  )
}