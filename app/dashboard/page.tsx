'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { EnhancedWikiUpload } from '@/components/EnhancedWikiUpload'
import { ManageableWikiList } from '@/components/ManageableWikiList'
import {
  BookOpenIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

interface WikiStats {
  totalWikis: number
  recentUploads: number
  totalDocuments: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  const [stats, setStats] = useState<WikiStats>({
    totalWikis: 0,
    recentUploads: 0,
    totalDocuments: 0
  })

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/wiki/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || {
          totalWikis: 0,
          recentUploads: 0,
          totalDocuments: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error)
    }
  }

  // Fetch stats on component mount and when refresh key changes
  useEffect(() => {
    if (session) {
      fetchStats()
    }
  }, [session, refreshKey])

  const handleUploadSuccess = () => {
    // Refresh the wiki list and stats after successful upload
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
        <div className="max-w-7xl mx-auto pt-6 pb-2 sm:px-6 lg:px-8">
          <div className="px-4 pt-6 pb-2 sm:px-0">
            {/* Welcome Message */}
            <div className="mb-8" data-testid="dashboard-welcome">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Welcome back, {session?.user?.email?.split('@')[0] || 'User'}!
                  </h1>
                  <p className="text-lg text-gray-600">
                    Here's what's happening with your wikis today.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-500">{session?.user?.email}</span>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" data-testid="stats-total-wikis">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpenIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Wikis</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalWikis}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" data-testid="stats-recent-uploads">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CloudArrowUpIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Recent Uploads</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.recentUploads}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" data-testid="stats-total-documents">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DocumentTextIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Documents</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalDocuments}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200" data-testid="stats-user-role">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ChartBarIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Role</p>
                    <p className="text-2xl font-semibold text-gray-900 capitalize">{isAdmin ? 'Admin' : 'User'}</p>
                  </div>
                </div>
              </div>
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

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Wiki Upload Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => router.push('/wiki')}
                      className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      data-testid="action-view-wikis"
                    >
                      <BookOpenIcon className="h-6 w-6 text-blue-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">View All Wikis</p>
                        <p className="text-sm text-gray-600">Browse your documentation</p>
                      </div>
                    </button>

                    <button
                      onClick={() => router.push('/upload')}
                      className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      data-testid="action-upload-wiki"
                    >
                      <CloudArrowUpIcon className="h-6 w-6 text-green-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Upload New Wiki</p>
                        <p className="text-sm text-gray-600">Add documentation</p>
                      </div>
                    </button>
                  </div>

                  {/* Enhanced Wiki Upload Component */}
                  <EnhancedWikiUpload onUploadSuccess={handleUploadSuccess} />
                </div>
              </div>

              {/* Recent Activity Sidebar */}
              <div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="dashboard-sidebar">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-500 text-center py-8">
                      <ChartBarIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>Activity tracking coming soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Wikis Section */}
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <ManageableWikiList
                  key={refreshKey}
                  onWikiSelect={handleWikiSelect}
                  onWikiDeleted={handleUploadSuccess}
                />
              </div>
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}