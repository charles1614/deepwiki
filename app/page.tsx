'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { WikiUpload } from '@/components/WikiUpload'
import { WikiList } from '@/components/WikiList'
import { CloudArrowUpIcon, BookOpenIcon } from '@heroicons/react/24/outline'
// import { getPublicSystemSettings } from '@/app/actions/public-settings'

export default function Home() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  const [recentWikis, setRecentWikis] = useState<any[]>([])
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome to DeepWiki')

  // Fetch recent wikis and settings on component mount
  useEffect(() => {
    const loadData = async () => {
      if (session) {
        fetchRecentWikis()
      }

      try {
        const response = await fetch('/api/settings/public')
        if (response.ok) {
          const settings = await response.json()
          if (settings['welcome_message']) {
            setWelcomeMessage(settings['welcome_message'])
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadData()
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
              {welcomeMessage}
            </h1>
            <p className="text-lg text-gray-600">
              Upload your markdown files to create beautiful, searchable documentation with interactive diagrams.
            </p>
          </div>

          {/* Admin Panel Removed */}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content - 3 columns on desktop */}
            <div className="lg:col-span-3 space-y-8">
              {/* Wiki Upload Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-400 transition-colors duration-200">
                <h2 className="text-xl font-semibold text-black mb-4">Upload Wiki</h2>
                <WikiUpload onUploadSuccess={handleUploadSuccess} />
              </div>

              {/* Wiki List Section */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-400 transition-colors duration-200">
                <WikiList
                  key={refreshKey}
                  onWikiSelect={handleWikiSelect}
                  onWikiDeleted={handleWikiDeleted}
                />
              </div>
            </div>

            {/* Sidebar - 1 column on desktop */}
            <div className="lg:col-span-1">
              {/* Quick Access Sidebar */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-6" data-testid="wiki-sidebar">
                <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Quick Access</h3>
                <div className="space-y-2" data-testid="quick-access">
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload New Wiki
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <BookOpenIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </button>
                </div>

                {/* Recent Wikis */}
                {recentWikis.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Recent Wikis</h3>
                    <div className="space-y-1">
                      {recentWikis.map((wiki) => (
                        <button
                          key={wiki.id}
                          onClick={() => handleWikiSelect(wiki)}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 rounded-md transition-colors"
                          data-testid={`wiki-link-${wiki.slug}`}
                        >
                          <div className="font-medium truncate">{wiki.title}</div>
                          <div className="text-xs text-gray-400 mt-0.5">
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