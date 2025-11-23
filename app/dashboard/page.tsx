'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'
import { WikiList } from '@/components/WikiList'
import { DashboardStats } from '@/components/DashboardStats'
import { DashboardActivityFeed } from '@/components/DashboardActivityFeed'
// import { getPublicSystemSettings } from '@/app/actions/public-settings'
import {
  BookOpenIcon,
  CloudArrowUpIcon,
  DocumentTextIcon,
  ChartBarIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  UsersIcon,
  ArrowPathIcon,
  LockClosedIcon,
  StarIcon,
  AcademicCapIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [refreshKey, setRefreshKey] = useState(0)
  const [activityFilter, setActivityFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [welcomeMessage, setWelcomeMessage] = useState('')

  // Get personalized greeting based on time of day
  const getPersonalizedGreeting = () => {
    if (welcomeMessage) return welcomeMessage

    const hour = new Date().getHours()
    const userName = session?.user?.email?.split('@')[0] || 'User'

    if (hour < 12) return `Good morning, ${userName}!`
    if (hour < 17) return `Good afternoon, ${userName}!`
    return `Good evening, ${userName}!`
  }

  useEffect(() => {
    const loadSettings = async () => {
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
    loadSettings()
  }, [])

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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {getPersonalizedGreeting()}
                  </h1>
                  <p className="text-base sm:text-lg text-gray-600">
                    Here's your wiki activity overview.
                  </p>
                </div>
                <div className="hidden sm:flex items-center space-x-4">
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    data-testid="refresh-stats"
                    aria-label="Refresh dashboard"
                  >
                    <ArrowPathIcon className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                    data-testid="manage-wikis-button"
                    aria-label="Manage wikis"
                  >
                    <CogIcon className="h-6 w-6 group-hover:rotate-90 transition-transform duration-200" />
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
              <div className="mb-8 p-5 bg-gradient-to-r from-red-50/50 via-red-50/30 to-gray-50 border border-red-200/40 rounded-xl shadow-sm" data-testid="admin-panel">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Admin Panel</h2>
                <div className="text-sm text-gray-600 leading-relaxed">
                  You have administrative privileges. You can manage all wikis and user content.
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
              {/* Quick Actions Section */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 h-auto sm:h-[300px] flex flex-col">
                  <h2 className="text-xl font-semibold text-gray-900 mb-5">Quick Actions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                    <button
                      onClick={() => handleQuickAction('view_wikis', '/wiki')}
                      className="flex items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/30 hover:from-blue-100 hover:to-blue-100/50 rounded-xl border border-blue-200/50 hover:border-blue-300/60 hover:shadow-sm transition-all duration-200 group"
                      data-testid="action-view-wikis"
                    >
                      <div className="p-2 bg-white/60 rounded-lg mr-3 group-hover:bg-white/80 transition-colors">
                        <BookOpenIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-sm">View All Wikis</p>
                        <p className="text-xs text-gray-500 mt-0.5">Browse your documentation</p>
                      </div>
                    </button>

                    <button
                      onClick={() => handleQuickAction('upload_wiki', '/upload')}
                      className="flex items-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/30 hover:from-blue-100 hover:to-blue-100/50 rounded-xl border border-blue-200/50 hover:border-blue-300/60 hover:shadow-sm transition-all duration-200 group"
                      data-testid="action-upload-wiki"
                    >
                      <div className="p-2 bg-white/60 rounded-lg mr-3 group-hover:bg-white/80 transition-colors">
                        <CloudArrowUpIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-gray-900 text-sm">Upload New Wiki</p>
                        <p className="text-xs text-gray-500 mt-0.5">Add documentation to upload page</p>
                      </div>
                    </button>

                    {/* Admin-only actions - visible but disabled for non-admins */}
                    <button
                      onClick={() => isAdmin && handleQuickAction('manage_users', '/admin/users')}
                      disabled={!isAdmin}
                      className={`flex items-center p-4 rounded-xl border transition-all duration-200 group ${isAdmin
                        ? 'bg-gradient-to-br from-gray-50 to-gray-100/30 hover:from-gray-100 hover:to-gray-100/50 border-gray-200/50 hover:border-gray-300/60 hover:shadow-sm cursor-pointer'
                        : 'bg-gray-100/40 border-gray-300/50 cursor-not-allowed'
                        }`}
                      title={!isAdmin ? "Only administrators can manage users" : ""}
                      data-testid="action-manage-users"
                    >
                      <div className={`p-2 rounded-lg mr-3 transition-colors ${isAdmin ? 'bg-white/60 group-hover:bg-white/80' : 'bg-white/40'
                        }`}>
                        <UsersIcon className={`h-5 w-5 ${isAdmin ? 'text-gray-700' : 'text-gray-400'}`} />
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold text-sm flex items-center gap-2 ${isAdmin ? 'text-gray-900' : 'text-gray-500'}`}>
                          Manage Users
                          {!isAdmin && <span className="text-xs font-normal text-gray-400">(Admin Only)</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">User accounts and permissions</p>
                      </div>
                    </button>

                    <button
                      onClick={() => isAdmin && handleQuickAction('system_settings', '/admin/settings')}
                      disabled={!isAdmin}
                      className={`flex items-center p-4 rounded-xl border transition-all duration-200 group ${isAdmin
                        ? 'bg-gradient-to-br from-gray-50 to-gray-100/30 hover:from-gray-100 hover:to-gray-100/50 border-gray-200/50 hover:border-gray-300/60 hover:shadow-sm cursor-pointer'
                        : 'bg-gray-100/40 border-gray-300/50 cursor-not-allowed'
                        }`}
                      title={!isAdmin ? "Only administrators can access system settings" : ""}
                      data-testid="action-system-settings"
                    >
                      <div className={`p-2 rounded-lg mr-3 transition-colors ${isAdmin ? 'bg-white/60 group-hover:bg-white/80' : 'bg-white/40'
                        }`}>
                        <Cog6ToothIcon className={`h-5 w-5 ${isAdmin ? 'text-gray-700' : 'text-gray-400'}`} />
                      </div>
                      <div className="text-left">
                        <p className={`font-semibold text-sm flex items-center gap-2 ${isAdmin ? 'text-gray-900' : 'text-gray-500'}`}>
                          System Settings
                          {!isAdmin && <span className="text-xs font-normal text-gray-400">(Admin Only)</span>}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Configure system options</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Enhanced Recent Activity Sidebar */}
              <div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200/60 p-6 h-auto sm:h-[300px] flex flex-col" data-testid="dashboard-sidebar">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Recent Activity</h3>
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
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <DashboardActivityFeed
                      filter={activityFilter}
                      key={`${refreshKey}-${activityFilter}`}
                    />
                  </div>
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
                  enableManagement={true}
                  showRefreshButton={false}
                  emptyStateMessage="Upload your first wiki to get started with documentation management"
                  maxItems={8}
                  onSeeMore={() => router.push('/wiki')}
                />
              </div>
            </div>
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}