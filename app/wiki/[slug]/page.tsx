'use client'

import { useState, useEffect } from 'react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchWiki = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/wiki/${params.slug}`)

        if (!response.ok) {
          if (response.status === 404) {
            setError('Wiki not found')
          } else {
            setError('Failed to load wiki')
          }
          return
        }

        const result = await response.json()

        if (result.success) {
          setWiki(result.wiki)
        } else {
          setError(result.error || 'Failed to load wiki')
        }
      } catch (err) {
        setError('Failed to load wiki. Please try again later.')
      } finally {
        setLoading(false)
      }
    }

    if (params.slug) {
      fetchWiki()
    }
  }, [params.slug])

  const handleBack = () => {
    router.push('/wiki')
  }

  if (loading) {
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

  if (!wiki) {
    return (
      <ProtectedRoute>
        <WithNavigation>
          <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
            <div className="px-4 py-2 sm:px-0">
              <div className="text-center py-12">
                <div className="text-gray-600 mb-4">Wiki not found</div>
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

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto py-2 sm:px-6 lg:px-8">
          <div className="px-4 pt-2 pb-1 sm:px-0">
            <WikiViewer wiki={wiki} onBack={handleBack} />
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}