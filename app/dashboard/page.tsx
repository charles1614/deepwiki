'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { WikiList } from '@/components/WikiList'
import { DashboardStats } from '@/components/DashboardStats'
import { DashboardActivityFeed } from '@/components/DashboardActivityFeed'
import {
  BookOpenIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowPathIcon,
  StarIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  const [activityFilter, setActivityFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Get personalized greeting based on time of day
  const getPersonalizedGreeting = () => {
    const hour = new Date().getHours()
    const userName = session?.user?.email?.split('@')[0] || 'User'

    if (hour < 12) return `Good morning, ${userName}!`
    if (hour < 17) return `Good afternoon, ${userName}!`
    return `Good evening, ${userName}!`
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setRefreshKey(prev => prev + 1)
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const trackQuickAction = async (action: string) => {
    try {
      await fetch('/api/analytics/quick-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: session?.user?.id,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to track quick action:', error)
    }
  }

  const handleQuickAction = (action: string, route: string) => {
    trackQuickAction(action)
    router.push(route)
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
                    {getPersonalizedGreeting()}
                  </h1>
                  <p className="text-lg text-gray-600">
                    Here's your wiki activity overview.
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="refresh-stats"
                    aria-label="Refresh dashboard"
                  >
                    <ArrowPathIcon className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <div className="flex items-center space-x-2">
                    <UserCircleIcon className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-500">{session?.user?.email}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Stats Cards */}
            <DashboardStats className="mb-8" />

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
              {/* Quick Actions Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleQuickAction('view_wikis', '/wiki')}
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
                      onClick={() => handleQuickAction('upload_wiki', '/upload')}
                      className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                      data-testid="action-upload-wiki"
                    >
                      <CloudArrowUpIcon className="h-6 w-6 text-green-600 mr-3" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Upload New Wiki</p>
                        <p className="text-sm text-gray-600">Add documentation to upload page</p>
                      </div>
                    </button>

                    {/* Admin-only actions */}
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleQuickAction('manage_users', '/admin/users')}
                          className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                          data-testid="action-manage-users"
                        >
                          <UsersIcon className="h-6 w-6 text-purple-600 mr-3" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Manage Users</p>
                            <p className="text-sm text-gray-600">User accounts and permissions</p>
                          </div>
                        </button>

                        <button
                          onClick={() => handleQuickAction('system_settings', '/admin/settings')}
                          className="flex items-center p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                          data-testid="action-system-settings"
                        >
                          <Cog6ToothIcon className="h-6 w-6 text-yellow-600 mr-3" />
                          <div className="text-left">
                            <p className="font-medium text-gray-900">System Settings</p>
                            <p className="text-sm text-gray-600">Configure system options</p>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Recent Activity Sidebar */}
              <div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" data-testid="dashboard-sidebar">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      data-testid="activity-filter"
                    >
                      <option value="all">All</option>
                      <option value="wiki_created">Created</option>
                      <option value="wiki_updated">Updated</option>
                      <option value="wiki_deleted">Deleted</option>
                    </select>
                  </div>
                  <DashboardActivityFeed
                    filter={activityFilter}
                    key={`${refreshKey}-${activityFilter}`}
                  />
                </div>
              </div>
            </div>

            {/* Recent Wikis Section */}
            <div className="mt-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <WikiList
                  key={refreshKey}
                  onWikiSelect={handleWikiSelect}
                  onWikiDeleted={() => setRefreshKey(prev => prev + 1)}
                />
              </div>
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}