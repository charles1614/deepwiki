'use client'

import React, { useState, useEffect } from 'react'
import { Clock, User, RotateCcw, GitCompare, Check, X, AlertCircle, Loader2 } from 'lucide-react'
import { getWikiVersions, restoreWikiVersion, compareWikiVersions, type WikiVersion, type VersionComparison } from '@/lib/api/wiki'

interface WikiVersionHistoryProps {
  wiki: {
    id: string
    title: string
    slug: string
  }
}

interface ComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  comparison: VersionComparison | null
}

const ComparisonModal: React.FC<ComparisonModalProps> = ({ isOpen, onClose, comparison }) => {
  if (!isOpen || !comparison) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Version Comparison</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close comparison modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            Comparing Version {comparison.fromVersion} → Version {comparison.toVersion}
          </p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {comparison.stats && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  <span>{comparison.stats.added} added</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span>{comparison.stats.removed} removed</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                  <span>{comparison.stats.modified} modified</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {comparison.differences && comparison.differences.map((diff, index) => (
              <div
                key={index}
                className={`p-3 rounded-md font-mono text-sm ${
                  diff.type === 'added'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : diff.type === 'removed'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-yellow-50 border border-yellow-200 text-yellow-800'
                }`}
              >
                <div className="flex items-start">
                  <span className="mr-3 text-gray-500">{diff.lineNumber}</span>
                  <div className="flex-1">
                    {diff.type === 'added' && <span className="mr-2">+</span>}
                    {diff.type === 'removed' && <span className="mr-2">-</span>}
                    {diff.type === 'modified' && <span className="mr-2">~</span>}
                    <span>
                      {diff.line || diff.toLine || diff.fromLine}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const RestoreConfirmationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  version: WikiVersion | null
}> = ({ isOpen, onClose, onConfirm, version }) => {
  if (!isOpen || !version) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Confirm Restore</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Are you sure you want to restore this version? This will create a new version with the content from version {version.version}.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
            >
              Restore
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function WikiVersionHistory({ wiki }: WikiVersionHistoryProps) {
  const [versions, setVersions] = useState<WikiVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<Set<number>>(new Set())
  const [comparison, setComparison] = useState<VersionComparison | null>(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [restoreModal, setRestoreModal] = useState<{ isOpen: boolean; version: WikiVersion | null }>({
    isOpen: false,
    version: null
  })
  const [restoring, setRestoring] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchVersions()
  }, [wiki.id])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      setError(null)
      const fetchedVersions = await getWikiVersions(wiki.id)
      setVersions(fetchedVersions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history')
    } finally {
      setLoading(false)
    }
  }

  const toggleVersionSelection = (version: number) => {
    const newSelection = new Set(selectedVersions)
    if (newSelection.has(version)) {
      newSelection.delete(version)
    } else {
      // Only allow 2 versions to be selected
      if (newSelection.size >= 2) {
        newSelection.clear()
      }
      newSelection.add(version)
    }
    setSelectedVersions(newSelection)
  }

  const handleCompare = async () => {
    if (selectedVersions.size !== 2) return

    const [fromVersion, toVersion] = Array.from(selectedVersions).sort()

    try {
      const result = await compareWikiVersions(wiki.id, fromVersion, toVersion)
      setComparison(result.comparison)
      setShowComparisonModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions')
    }
  }

  const handleRestore = async (version: WikiVersion) => {
    try {
      setRestoring(true)
      await restoreWikiVersion(wiki.id, version.version)
      setSuccessMessage(`Successfully restored to version ${version.version}`)
      setRestoreModal({ isOpen: false, version: null })
      // Refresh versions after successful restore
      await fetchVersions()

      // Hide success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore version')
    } finally {
      setRestoring(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="version-history-loading">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Loading version history...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load version history</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchVersions}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
        {selectedVersions.size === 2 && (
          <button
            onClick={handleCompare}
            className="flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare Selected
          </button>
        )}
      </div>

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md flex items-center">
          <Check className="w-5 h-5 text-green-600 mr-2" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      <div className="space-y-3">
        {versions.map((version) => (
          <div
            key={version.id}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <input
                  type="checkbox"
                  checked={selectedVersions.has(version.version)}
                  onChange={() => toggleVersionSelection(version.version)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select version ${version.version} for comparison`}
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-gray-900">Version {version.version}</h3>
                    {version.changeLog && (
                      <span className="text-sm text-gray-600">• {version.changeLog}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      {version.user.email}
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(version.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setRestoreModal({ isOpen: true, version })}
                className="flex items-center px-3 py-1 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                aria-label={`Restore version ${version.version}`}
                disabled={restoring}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>

      {versions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No version history available for this wiki.
        </div>
      )}

      <ComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        comparison={comparison}
      />

      <RestoreConfirmationModal
        isOpen={restoreModal.isOpen}
        onClose={() => setRestoreModal({ isOpen: false, version: null })}
        onConfirm={() => restoreModal.version && handleRestore(restoreModal.version)}
        version={restoreModal.version}
      />
    </div>
  )
}