'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
}

interface WikiUploadProps {
  onUploadSuccess: (wiki: Wiki) => void
}

export function WikiUpload({ onUploadSuccess }: WikiUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles(selectedFiles)
    setError(null)
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

  const handleUpload = useCallback(async () => {
    setError(null)

    if (!validateFiles()) {
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/wiki/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Upload failed.')
        return
      }

      if (result.success) {
        onUploadSuccess(result.wiki)
        setFiles([])
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        setError(result.error || 'Upload failed.')
      }
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }, [files, validateFiles, onUploadSuccess])

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setError(null)
  }, [])

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Wiki Files</h2>

      <div className="space-y-4">
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
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
          />
          <p className="text-xs text-gray-500 mt-1">
            Select multiple .md files. index.md is required.
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files:</h3>
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? 'Uploading' : 'Upload Wiki'}
        </button>
      </div>
    </div>
  )
}