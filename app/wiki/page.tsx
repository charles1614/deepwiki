'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { WikiList } from '@/components/WikiList'

export default function WikiPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch recent wikis on component mount and when refresh key changes
  useEffect(() => {
    if (session) {
      // Refresh logic can be added here if needed
    }
  }, [session, refreshKey])

  
  const handleWikiSelect = (wiki: { slug: string }) => {
    // Navigate to the individual wiki view
    router.push(`/wiki/${wiki.slug}`)
  }

  const handleWikiDeleted = () => {
    // Refresh the wiki list after deletion
    setRefreshKey(prev => prev + 1)
  }

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">
                Wiki Documentation
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Browse and manage your markdown documentation with interactive diagrams.
                <br />
                <span className="text-xs">
                  Need to upload new documentation? Use the{' '}
                  <a href="/upload" className="text-blue-600 hover:text-blue-800 underline">
                    Upload page
                  </a>{' '}
                  in the navigation.
                </span>
              </p>
            </div>

            {/* Wiki List Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <WikiList
                key={refreshKey}
                onWikiSelect={handleWikiSelect}
                onWikiDeleted={handleWikiDeleted}
                enableManagement={true}
                showRefreshButton={false}
                emptyStateMessage="Upload your first wiki to get started with documentation browsing"
              />
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}