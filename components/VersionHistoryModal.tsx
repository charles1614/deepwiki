import React, { useState, useEffect } from 'react'
import { WikiFile } from './WikiViewer'

interface WikiVersion {
  id: string
  versionNumber: number
  changeType: string
  changeDescription: string | null
  contentSize: number
  checksum: string
  createdAt: string
  author: {
    id: string
    name: string | null
    email: string
  }
}

interface VersionHistoryModalProps {
  wiki: {
    id: string
    title: string
    slug: string
    description: string | null
    createdAt: string
    updatedAt: string
  }
  file: WikiFile
  isOpen: boolean
  onClose: () => void
}

export function VersionHistoryModal({
  wiki,
  file,
  isOpen,
  onClose
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<WikiVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && file) {
      fetchVersions()
    }
  }, [isOpen, file])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/wiki/${wiki.slug}/pages/${file.filename}/versions`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch version history')
      }

      const data = await response.json()
      setVersions(data.data.versions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch version history')
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Are you sure you want to rollback to version ${versionNumber}? This will create a new version with the content from that version.`)) {
      return
    }

    try {
      setRollingBack(versionId)
      setError(null)

      const response = await fetch(
        `/api/wiki/${wiki.slug}/pages/${file.filename}/versions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ versionId }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to rollback version')
      }

      // Refresh versions after successful rollback
      await fetchVersions()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback version')
    } finally {
      setRollingBack(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'CREATE':
        return 'text-green-600 bg-green-50'
      case 'UPDATE':
        return 'text-blue-600 bg-blue-50'
      case 'DELETE':
        return 'text-red-600 bg-red-50'
      case 'ROLLBACK':
        return 'text-orange-600 bg-orange-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Version History
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {file.filename} • {formatFileSize(file.size)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No version history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg font-medium text-gray-900">
                          Version {version.versionNumber}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getChangeTypeColor(
                            version.changeType
                          )}`}
                        >
                          {version.changeType}
                        </span>
                        {version.versionNumber === 1 && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Current
                          </span>
                        )}
                      </div>

                      {version.changeDescription && (
                        <p className="text-sm text-gray-700 mb-2">
                          {version.changeDescription}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>
                          By {version.author.name || version.author.email}
                        </span>
                        <span>•</span>
                        <span>{formatDate(version.createdAt)}</span>
                        <span>•</span>
                        <span>{formatFileSize(version.contentSize)}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {version.versionNumber > 1 && (
                        <button
                          onClick={() => handleRollback(version.id, version.versionNumber)}
                          disabled={rollingBack === version.id}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rollingBack === version.id ? 'Rolling back...' : 'Rollback'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Only the last 3 versions are maintained automatically
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}