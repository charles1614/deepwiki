'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { WikiViewer } from '@/components/WikiViewer'

interface Wiki {
  id: string
  title: string
  slug: string
  description: string
  createdAt: string
  updatedAt: string
}

export default function WikiViewPage() {
  const params = useParams()
  const router = useRouter()
  const [wiki, setWiki] = useState<Wiki | null>(null)
  const [files, setFiles] = useState<any[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWiki = useCallback(async () => {
    if (!params.slug) return
    
    try {
      setInitialLoading(true)
      setError(null)

      const response = await fetch(`/api/wiki/slug/${params.slug}`, {
        cache: 'no-store', // Bypass cache to get fresh data
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        if (response.status === 404) {
          setError('Wiki not found')
        } else {
          setError('Failed to load wiki')
        }
        setInitialLoading(false)
        return
      }

      const result = await response.json()

      if (result.success) {
        setWiki(result.wiki)
        setFiles(result.wiki.files || [])
        // Immediately render WikiViewer once we have wiki and files metadata
        setInitialLoading(false)
      } else {
        setError(result.error || 'Failed to load wiki')
        setInitialLoading(false)
      }
    } catch (err) {
      setError('Failed to load wiki. Please try again later.')
      setInitialLoading(false)
    }
  }, [params.slug])

  useEffect(() => {
    fetchWiki()
  }, [fetchWiki])

  const handleBack = () => {
    router.push('/wiki')
  }

  // Show error state
  if (error) {
    return (
      <ProtectedRoute>
        <WithNavigation>
          <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
            <div className="px-4 py-2 sm:px-0">
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">{error}</div>
                <button
                  onClick={handleBack}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  ← Back to Wikis
                </button>
              </div>
            </div>
          </div>
        </WithNavigation>
      </ProtectedRoute>
    )
  }

  // Show loading skeleton only for initial metadata load
  if (initialLoading || !wiki) {
    return (
      <ProtectedRoute>
        <WithNavigation>
          <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
            <div className="px-4 py-2 sm:px-0">
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading wiki...</div>
              </div>
            </div>
          </div>
        </WithNavigation>
      </ProtectedRoute>
    )
  }

  // Render WikiViewer immediately once we have wiki and files metadata
  // Content loading will be handled inside WikiViewer
  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto py-2 px-4 sm:px-6 lg:px-8 w-full overflow-x-hidden">
          <div className="w-full max-w-full overflow-x-hidden">
            <WikiViewer wiki={wiki} files={files} onBack={handleBack} onFilesRefresh={fetchWiki} />
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}