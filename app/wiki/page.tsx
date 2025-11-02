'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WikiUpload } from '@/components/WikiUpload'
import { WikiList } from '@/components/WikiList'

export default function WikiPage() {
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    // Refresh the wiki list after successful upload
    setRefreshKey(prev => prev + 1)
  }

  const handleWikiSelect = (wiki: { slug: string }) => {
    // Navigate to the wiki view page
    router.push(`/wiki/${wiki.slug}`)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Wiki Documentation
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Upload and view markdown documentation with support for Mermaid diagrams.
              </p>
            </div>

            {/* Wiki Upload Section */}
            <div className="mb-12">
              <WikiUpload onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Wiki List Section */}
            <div>
              <WikiList key={refreshKey} onWikiSelect={handleWikiSelect} />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}