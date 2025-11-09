'use client'

import React, { useState } from 'react'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

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

interface DeletePageModalProps {
  wiki: Wiki
  files: WikiFile[]
  isOpen: boolean
  onClose: () => void
  onPageDeleted: (deletedFileIds: string[]) => void
}

export function DeletePageModal({ wiki, files, isOpen, onClose, onPageDeleted }: DeletePageModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/wiki/${wiki.slug}/pages`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileIds: files.map(file => file.id)
        }),
      })

      const result = await response.json()

      if (result.success) {
        onPageDeleted(files.map(file => file.id))
        onClose()
        // Reload page to refresh file list
        window.location.reload()
      } else {
        setError(result.error || 'Failed to delete pages')
      }
    } catch (err) {
      setError('An error occurred while deleting the pages')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  const hasIndexFile = files.some(file => file.filename === 'index.md')
  const deletableFiles = files.filter(file => file.filename !== 'index.md')
  const canDelete = deletableFiles.length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
          </div>

          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {files.length === 1 ? 'Delete Page' : `Delete ${files.length} Pages`}
            </h3>

            <div className="mb-4">
              {files.length === 0 ? (
                <p className="text-sm text-gray-500">No pages selected</p>
              ) : hasIndexFile && !canDelete ? (
                <p className="text-sm text-red-600">
                  Cannot delete index.md - it is the main page of this wiki.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-2">
                    Are you sure you want to delete the following {deletableFiles.length === 1 ? 'page' : 'pages'}?
                  </p>
                  <div className="bg-gray-50 rounded-md p-3 mb-2">
                    {deletableFiles.map((file) => (
                      <div key={file.id} className="text-sm text-gray-700">
                        {file.filename}
                      </div>
                    ))}
                    {hasIndexFile && (
                      <div key="index-warning" className="text-sm text-red-600 italic mt-1">
                        index.md (cannot be deleted)
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-red-600 font-medium">
                    This action will permanently delete {deletableFiles.length} {deletableFiles.length === 1 ? 'page' : 'pages'} and cannot be undone.
                  </p>
                </>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Delete'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}