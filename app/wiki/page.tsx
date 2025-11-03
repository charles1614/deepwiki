'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { EnhancedWikiUpload } from '@/components/EnhancedWikiUpload'
import { WikiList } from '@/components/WikiList'

export default function WikiPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)

  const handleUploadSuccess = () => {
    // Refresh the wiki list after successful upload
    setRefreshKey(prev => prev + 1)
  }

  const handleWikiSelect = (wiki: { slug: string }) => {
    // Navigate to the wiki view page
    router.push(`/wiki/${wiki.slug}`)
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Welcome Message */}
            <div className="mb-8" data-testid="welcome-message">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to DeepWiki
              </h1>
              <p className="text-lg text-gray-600">
                Upload your markdown files to create beautiful, searchable documentation with interactive diagrams.
              </p>
            </div>

            {/* Admin Panel */}
            {isAdmin && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="admin-panel">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Admin Panel</h2>
                <div className="text-sm text-blue-700">
                  You have administrative privileges. You can manage all wikis and user content.
                </div>
              </div>
            )}

            {/* Wiki Upload Section */}
            <div className="mb-12">
              <EnhancedWikiUpload onUploadSuccess={handleUploadSuccess} />
            </div>

            {/* Wiki List Section */}
            <div>
              <WikiList key={refreshKey} onWikiSelect={handleWikiSelect} />
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}