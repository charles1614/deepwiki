'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { EnhancedWikiUpload } from '@/components/EnhancedWikiUpload'
import { ManageableWikiList } from '@/components/ManageableWikiList'
import { CloudArrowUpIcon, BookOpenIcon } from '@heroicons/react/24/outline'

export default function WikiPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  const [recentWikis, setRecentWikis] = useState<any[]>([])

  // Fetch recent wikis on component mount and when refresh key changes
  useEffect(() => {
    if (session) {
      fetchRecentWikis()
    }
  }, [session, refreshKey])

  const fetchRecentWikis = async () => {
    try {
      const response = await fetch('/api/wiki/list')
      if (response.ok) {
        const data = await response.json()
        setRecentWikis(data.wikis?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Failed to fetch recent wikis:', error)
    }
  }

  const handleUploadSuccess = () => {
    // Refresh the wiki list after successful upload
    setRefreshKey(prev => prev + 1)
  }

  const handleWikiSelect = (wiki: { slug: string }) => {
    // Navigate to the wiki view page
    router.push(`/wiki/${wiki.slug}`)
  }

  const handleWikiDeleted = () => {
    // Refresh the wiki list after deletion
    setRefreshKey(prev => prev + 1)
    // Also refresh recent wikis in sidebar
    fetchRecentWikis()
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
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

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - 3 columns on desktop */}
            <div className="lg:col-span-3 space-y-8">
              {/* Wiki Upload Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Wiki</h2>
                <EnhancedWikiUpload onUploadSuccess={handleUploadSuccess} />
              </div>

              {/* Wiki List Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <ManageableWikiList
                  key={refreshKey}
                  onWikiSelect={handleWikiSelect}
                  onWikiDeleted={handleWikiDeleted}
                />
              </div>
            </div>

            {/* Sidebar - 1 column on desktop */}
            <div className="lg:col-span-1">
              {/* Quick Access Sidebar */}
              <div className="bg-gray-50 rounded-lg p-4 sticky top-6" data-testid="wiki-sidebar">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Access</h3>
                <div className="space-y-2" data-testid="quick-access">
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition-colors"
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload New Wiki
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition-colors"
                  >
                    <BookOpenIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </button>
                </div>

                {/* Recent Wikis */}
                {recentWikis.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Wikis</h3>
                    <div className="space-y-2">
                      {recentWikis.map((wiki) => (
                        <button
                          key={wiki.id}
                          onClick={() => handleWikiSelect(wiki)}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition-colors"
                          data-testid={`wiki-link-${wiki.slug}`}
                        >
                          <div className="font-medium text-gray-900 truncate">{wiki.title}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(wiki.updatedAt).toLocaleDateString()}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}