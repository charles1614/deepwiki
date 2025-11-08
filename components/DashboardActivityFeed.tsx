'use client'

import { useState, useEffect } from 'react'
import { 
  DocumentTextIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface Activity {
  id: string
  type: 'wiki_created' | 'wiki_updated' | 'wiki_deleted' | 'wiki_viewed'
  wikiTitle: string
  userEmail: string
  timestamp: string
  metadata?: Record<string, any>
}

interface DashboardActivityFeedProps {
  className?: string
  filter?: string
}

export function DashboardActivityFeed({ className = '', filter = 'all' }: DashboardActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [filter])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/activities${filter !== 'all' ? `?type=${filter}` : ''}`)
      if (!response.ok) throw new Error('Failed to fetch activities')

      const data = await response.json()
      setActivities(data.activities || [])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    const iconClass = 'h-5 w-5'
    switch (type) {
      case 'wiki_created':
        return <PlusIcon className={`${iconClass} text-blue-600`} data-testid={`activity-icon-${type}`} />
      case 'wiki_updated':
        return <PencilIcon className={`${iconClass} text-blue-600`} data-testid={`activity-icon-${type}`} />
      case 'wiki_deleted':
        return <TrashIcon className={`${iconClass} text-red-600`} data-testid={`activity-icon-${type}`} />
      case 'wiki_viewed':
        return <EyeIcon className={`${iconClass} text-gray-600`} data-testid={`activity-icon-${type}`} />
      default:
        return <DocumentTextIcon className={`${iconClass} text-gray-600`} />
    }
  }

  const getRelativeTime = (timestamp: string) => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffMs = now.getTime() - activityTime.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return activityTime.toLocaleDateString()
  }

  const getActivityDescription = (activity: Activity) => {
    const userEmail = activity.userEmail.split('@')[0]
    switch (activity.type) {
      case 'wiki_created':
        return `${userEmail} created "${activity.wikiTitle}"`
      case 'wiki_updated':
        return `${userEmail} updated "${activity.wikiTitle}"`
      case 'wiki_deleted':
        return `${userEmail} deleted "${activity.wikiTitle}"`
      case 'wiki_viewed':
        return `${userEmail} viewed "${activity.wikiTitle}"`
      default:
        return `${userEmail} acted on "${activity.wikiTitle}"`
    }
  }

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`} data-testid="activity-skeleton">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="h-5 w-5 bg-gray-300 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={fetchActivities}
          className="mt-2 text-gray-600 hover:text-gray-800 text-sm"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="h-12 w-12 text-gray-300 mx-auto mb-2 flex items-center justify-center">
          <SparklesIcon className="h-12 w-12" />
        </div>
        <p className="text-gray-500 text-sm" data-testid="no-activities">No recent activity</p>
        <p className="text-gray-400 text-xs mt-1">Start by creating or updating wikis to see activity here.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50/80 rounded-lg border border-transparent hover:border-blue-200/30 transition-all duration-200 group">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`p-1.5 rounded-md transition-colors ${
              activity.type === 'wiki_created' || activity.type === 'wiki_updated' 
                ? 'bg-blue-50/50 group-hover:bg-blue-50' 
                : activity.type === 'wiki_deleted'
                ? 'bg-red-50/50 group-hover:bg-red-50'
                : 'bg-gray-100/50 group-hover:bg-gray-100'
            }`}>
              {getActivityIcon(activity.type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 leading-snug">
              {getActivityDescription(activity)}
            </p>
            <p className="text-xs text-gray-500 mt-1.5 font-medium">
              {getRelativeTime(activity.timestamp)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DashboardActivityFeed