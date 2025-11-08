'use client'

import React, { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

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

interface WikiUploadProps {
  onUploadSuccess: (wiki: Wiki) => void
  enableProgressTracking?: boolean
  enableCancellation?: boolean
  maxFileSize?: number
  maxFiles?: number
  allowedFileTypes?: string[]
}

export function WikiUpload({
  onUploadSuccess,
  enableProgressTracking = true,
  enableCancellation = true,
  maxFileSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 50,
  allowedFileTypes = ['.md']
}: WikiUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([])
  const [uploading, setUploading] = useState(false)
  const [overallProgress, setOverallProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [cancelled, setCancelled] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const processFiles = useCallback((selectedFiles: File[]) => {
    // Validate file count
    if (selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`)
      return
    }

    setFiles(selectedFiles)

    if (enableProgressTracking) {
      // Initialize progress tracking
      const progress = selectedFiles.map(file => ({
        file,
        progress: 0,
        status: 'pending' as const
      }))
      setFileProgress(progress)
    }

    setError(null)
    setUploadStatus('idle')
    setOverallProgress(0)
  }, [maxFiles, enableProgressTracking])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    processFiles(selectedFiles)
    
    // Reset input value after processing to allow selecting the same file again in Chrome
    // Chrome doesn't trigger onChange if the same file is selected
    // Use setTimeout to ensure files are processed before resetting
    setTimeout(() => {
      if (event.target && fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }, 0)
  }, [processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter(file =>
      allowedFileTypes.some(ext => file.name.endsWith(ext))
    )
    
    if (validFiles.length > 0) {
      processFiles(validFiles)
    } else {
      setError(`Only ${allowedFileTypes.join(', ')} files are allowed.`)
    }
  }, [processFiles, allowedFileTypes])

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only trigger if not uploading
    if (uploading) {
      return
    }
    
    // Check if click is on a button or interactive element
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) {
      return
    }
    
    // Trigger file input click immediately (synchronous)
    // Browser security requires this to be triggered by user interaction
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [uploading])

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

    // Validate file types
    const invalidFiles = files.filter(file =>
      !allowedFileTypes.some(ext => file.name.endsWith(ext))
    )
    if (invalidFiles.length > 0) {
      setError(`Only ${allowedFileTypes.join(', ')} files are allowed.`)
      return false
    }

    // Check total size
    const totalSize = files.reduce((sum, file) => sum + file.size, 0)
    if (totalSize > maxFileSize) {
      setError(`File size too large. Maximum allowed size is ${(maxFileSize / 1024 / 1024).toFixed(1)}MB`)
      return false
    }

    return true
  }, [files, allowedFileTypes, maxFileSize])

  const updateFileProgress = useCallback((fileIndex: number, progress: number, status: FileProgress['status'], error?: string) => {
    if (!enableProgressTracking) return

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
      const overall = current.length > 0 ? totalProgress / current.length : 0
      setOverallProgress(overall)
      return current
    })
  }, [enableProgressTracking])

  // Simulate individual file progress during batch upload
  const simulateIndividualFileProgress = useCallback(() => {
    if (!enableProgressTracking) return () => {}

    let currentFileIndex = 0
    const interval = setInterval(() => {
      if (currentFileIndex < fileProgress.length && uploading) {
        // Update current file progress gradually
        setFileProgress(prev => {
          const updated = [...prev]
          if (updated[currentFileIndex]) {
            const currentProgress = updated[currentFileIndex].progress
            const newProgress = Math.min(currentProgress + 25, 95) // Increment but cap at 95%
            updated[currentFileIndex] = { ...updated[currentFileIndex], progress: newProgress, status: 'uploading' }

            // If this file reaches 95%, move to next file
            if (newProgress >= 95 && currentFileIndex < updated.length - 1) {
              currentFileIndex++
            }
          }
          return updated
        })
      } else {
        clearInterval(interval)
      }
    }, 300) // Update every 300ms

    return () => clearInterval(interval)
  }, [fileProgress.length, uploading, enableProgressTracking])

  const handleUpload = useCallback(async () => {
    setError(null)
    setCancelled(false)

    if (!validateFiles()) {
      return
    }

    setUploading(true)
    setUploadStatus('uploading')

    // Create abort controller for cancellation
    if (enableCancellation) {
      abortControllerRef.current = new AbortController()
    }

    // Start individual file progress simulation
    const stopSimulation = simulateIndividualFileProgress()

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      let result: any

      if (enableProgressTracking) {
        // Custom fetch with progress tracking using XMLHttpRequest
        const uploadPromise = new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()

          // Track upload progress
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = (event.loaded / event.total) * 100
              setOverallProgress(progress)
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status === 200 || xhr.status === 201) {
              try {
                const result = JSON.parse(xhr.responseText)
                resolve(result)
              } catch (e) {
                reject(new Error('Invalid response from server'))
              }
            } else {
              reject(new Error(`Upload failed: ${xhr.statusText} (${xhr.status})`))
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

        result = await uploadPromise
      } else {
        // Simple fetch without progress tracking
        const response = await fetch('/api/wiki/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`)
        }

        result = await response.json()
      }

      if (result.success) {
        if (enableProgressTracking) {
          // Mark all files as completed
          fileProgress.forEach((_, index) => {
            updateFileProgress(index, 100, 'completed')
          })
        }

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
        if (enableProgressTracking) {
          fileProgress.forEach((_, index) => {
            updateFileProgress(index, 0, 'pending')
          })
        }
      } else {
        setUploadStatus('error')
        setError(err.message || 'Upload failed. Please try again.')

        if (enableProgressTracking) {
          // Mark files as failed
          fileProgress.forEach((_, index) => {
            updateFileProgress(index, 0, 'error', err.message)
          })
        }
      }
    } finally {
      setUploading(false)
      abortControllerRef.current = null
      stopSimulation() // Stop the progress simulation
    }
  }, [files, validateFiles, fileProgress, updateFileProgress, onUploadSuccess, simulateIndividualFileProgress, enableProgressTracking, enableCancellation])

  const cancelUpload = useCallback(() => {
    if (enableCancellation && abortControllerRef.current) {
      abortControllerRef.current.abort()
      setCancelled(true)
    }
  }, [enableCancellation])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (enableProgressTracking) {
      setFileProgress(prev => prev.filter((_, i) => i !== index))
    }
    setError(null)
  }, [enableProgressTracking])

  const retryUpload = useCallback(() => {
    setError(null)
    setUploadStatus('idle')
    setOverallProgress(0)
    if (enableProgressTracking) {
      fileProgress.forEach((_, index) => {
        updateFileProgress(index, 0, 'pending')
      })
    }
  }, [fileProgress, updateFileProgress, enableProgressTracking])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
          <CloudArrowUpIcon className="h-6 w-6 text-blue-600" />
          Upload Wiki Files
        </h2>
        <p className="text-sm text-gray-500">
          Upload your markdown documentation files to create a new wiki
        </p>
      </div>

      <div className="space-y-4">
        {/* Drag and Drop Area */}
        <label
          htmlFor="file-input"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-all block
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <input
            ref={fileInputRef}
            id="file-input"
            data-testid="file-input"
            type="file"
            multiple
            accept={allowedFileTypes.join(',')}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className={`
              p-3 rounded-full transition-colors
              ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}
            `}>
              <CloudArrowUpIcon className={`h-10 w-10 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
            
            <div>
              <p className="text-base font-medium text-gray-900 mb-1">
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                or <span className="text-blue-600 font-medium">browse</span> to select files
              </p>
              <p className="text-xs text-gray-400">
                Select multiple {allowedFileTypes.join(', ')} files • index.md is required • Max {(maxFileSize / 1024 / 1024).toFixed(1)}MB per file
              </p>
            </div>
          </div>
        </label>

        {/* File List with/without Progress */}
        {files.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DocumentIcon className="h-4 w-4 text-gray-400" />
                Selected Files ({files.length})
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {enableProgressTracking ? (
                // Enhanced file list with progress
                fileProgress.map((fp, index) => (
                  <div 
                    key={index} 
                    className={`
                      border rounded-lg p-3 transition-all
                      ${fp.status === 'error' 
                        ? 'border-red-200 bg-red-50' 
                        : fp.status === 'completed'
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <DocumentIcon className={`h-4 w-4 flex-shrink-0 ${
                          fp.status === 'error' ? 'text-red-500' :
                          fp.status === 'completed' ? 'text-green-500' :
                          'text-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {fp.file.name}
                            </span>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {(fp.file.size / 1024).toFixed(1)} KB
                            </span>
                            {fp.status === 'completed' && (
                              <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                            )}
                            {fp.status === 'error' && (
                              <ExclamationCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        {fp.status === 'error' && (
                          <span className="text-xs text-red-600 font-medium hidden sm:inline" data-testid={`file-error-${fp.file.name}`}>
                            {fp.error}
                          </span>
                        )}
                        {!uploading && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(index)
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded"
                            data-testid={`remove-file-${index}`}
                            aria-label="Remove file"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {uploading && (
                      <div className="w-full mt-2">
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
                ))
              ) : (
                // Simple file list without progress
                files.map((file, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <DocumentIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <span className="text-sm text-gray-700 truncate">{file.name}</span>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded ml-2 flex-shrink-0"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Overall Progress */}
        {enableProgressTracking && uploading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4" data-testid="upload-progress">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <CloudArrowUpIcon className="h-4 w-4 text-blue-600" />
                Overall Upload Progress
              </h3>
              <span className="text-sm font-medium text-gray-600">
                {Math.round(overallProgress)}%
              </span>
            </div>
            <ProgressBar
              progress={overallProgress}
              status={uploadStatus === 'idle' ? undefined : uploadStatus}
              showPercentage={true}
              message={
                uploadStatus === 'uploading' ? `Uploading ${files.length} files...` :
                uploadStatus === 'processing' ? 'Processing uploaded files...' :
                uploadStatus === 'completed' ? 'Upload completed successfully!' :
                uploadStatus === 'error' ? 'Upload failed' : ''
              }
            />

            {enableCancellation && uploading && !cancelled && (
              <button
                onClick={cancelUpload}
                className="mt-3 text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 transition-colors"
                data-testid="cancel-upload"
              >
                <XMarkIcon className="h-4 w-4" />
                Cancel Upload
              </button>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2" data-testid="error-message">
            <ExclamationCircleIcon className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">{error}</p>
              {uploadStatus === 'error' && (
                <button
                  onClick={retryUpload}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium underline"
                  data-testid="retry-upload"
                >
                  Retry Upload
                </button>
              )}
            </div>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-5 rounded-lg hover:from-blue-700 hover:to-indigo-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                     font-semibold text-sm shadow-md hover:shadow-lg
                     flex items-center justify-center gap-2"
          data-testid="upload-button"
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading Files...
            </>
          ) : (
            <>
              <CloudArrowUpIcon className="h-4 w-4" />
              Upload Wiki
            </>
          )}
        </button>
      </div>
    </div>
  )
}