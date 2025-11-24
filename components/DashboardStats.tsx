'use client'

import { useState, useEffect } from 'react'
import { BookOpenIcon, CloudArrowUpIcon, DocumentTextIcon, ChartBarIcon } from '@heroicons/react/24/outline'

// Hook for responsive design
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)

  useEffect(() => {
    const checkResponsive = () => {
      setIsMobile(window.innerWidth < 768)
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024)
    }

    checkResponsive()
    window.addEventListener('resize', checkResponsive)
    return () => window.removeEventListener('resize', checkResponsive)
  }, [])

  return { isMobile, isTablet }
}

interface Stats {
  totalWikis: number
  recentUploads: number
  totalDocuments: number
  weeklyActiveUsers?: number
  averageTimeOnPage?: number
  bounceRate?: number
}

interface StatsTrends {
  totalWikis?: { direction: 'up' | 'down' | 'neutral'; percentage: number }
  recentUploads?: { direction: 'up' | 'down' | 'neutral'; percentage: number }
  totalDocuments?: { direction: 'up' | 'down' | 'neutral'; percentage: number }
  weeklyActiveUsers?: { direction: 'up' | 'down' | 'neutral'; percentage: number }
}

interface DashboardStatsProps {
  className?: string
}

export function DashboardStats({ className = '' }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalWikis: 0,
    recentUploads: 0,
    totalDocuments: 0
  })
  const [trends, setTrends] = useState<StatsTrends>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile, isTablet } = useResponsive()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/stats')
      if (!response.ok) throw new Error('Failed to fetch statistics')

      const data = await response.json()
      setStats(data.stats || {
        totalWikis: 0,
        recentUploads: 0,
        totalDocuments: 0
      })
      setTrends(data.trends || {})
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getTrendIcon = (trend?: { direction: 'up' | 'down' | 'neutral'; percentage: number }, color?: string) => {
    if (!trend) return null

    const textClass = trend.direction === 'up'
      ? (color || 'text-gray-600')
      : trend.direction === 'down'
        ? 'text-gray-500'
        : 'text-gray-500'
    const symbol = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'

    return <span className={`h-4 w-4 ${textClass}`}>{symbol}</span>
  }

  const getTrendText = (trend?: { direction: 'up' | 'down' | 'neutral'; percentage: number }) => {
    if (!trend) return null
    const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''
    return `${sign}${trend.percentage}%`
  }

  const formatTime = (seconds?: number) => {
    if (!seconds) return '0m 0s'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  if (loading) {
    return (
      <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${!isMobile && !isTablet ? 'lg:grid-cols-4' : ''} gap-6 ${className}`} data-testid="stats-skeleton">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
            <div className="flex items-center">
              <div className="p-2 bg-gray-200 rounded-lg">
                <div className="h-6 w-6 bg-gray-300 rounded"></div>
              </div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-800 font-medium">Unable to load statistics</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
          <button
            onClick={fetchStats}
            className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${!isMobile && !isTablet ? 'lg:grid-cols-4' : ''} gap-6 ${className}`} data-testid="stats-grid">
      {/* Total Wikis */}
      <div className={`bg-white ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-gray-200 hover:border-gray-400 transition-colors duration-200`} data-testid="stats-total-wikis">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <BookOpenIcon className="h-5 w-5 text-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Wikis</p>
              <p className="text-2xl font-semibold text-black mt-1">{stats.totalWikis}</p>
            </div>
          </div>
          {trends.totalWikis && (
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.totalWikis, 'text-black')}
              <span className={`text-sm font-medium ${trends.totalWikis.direction === 'up' ? 'text-black' :
                trends.totalWikis.direction === 'down' ? 'text-gray-500' : 'text-gray-600'
                }`} data-testid={`trend-${trends.totalWikis.direction}-totalWikis`}>
                {getTrendText(trends.totalWikis)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      <div className={`bg-white ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-gray-200 hover:border-gray-400 transition-colors duration-200`} data-testid="stats-recent-uploads">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <CloudArrowUpIcon className="h-5 w-5 text-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Recent Uploads</p>
              <p className="text-2xl font-semibold text-black mt-1">{stats.recentUploads}</p>
            </div>
          </div>
          {trends.recentUploads && (
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.recentUploads, 'text-black')}
              <span className={`text-sm font-medium ${trends.recentUploads.direction === 'up' ? 'text-black' :
                trends.recentUploads.direction === 'down' ? 'text-black' : 'text-gray-600'
                }`} data-testid={`trend-${trends.recentUploads.direction}-recentUploads`}>
                {getTrendText(trends.recentUploads)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Total Documents */}
      <div className={`bg-white ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-gray-200 hover:border-gray-400 transition-colors duration-200`} data-testid="stats-total-documents">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <DocumentTextIcon className="h-5 w-5 text-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Documents</p>
              <p className="text-2xl font-semibold text-black mt-1">{stats.totalDocuments}</p>
            </div>
          </div>
          {trends.totalDocuments && (
            <div className="flex items-center space-x-1">
              {getTrendIcon(trends.totalDocuments, 'text-black')}
              <span className={`text-sm font-medium ${trends.totalDocuments.direction === 'up' ? 'text-black' :
                trends.totalDocuments.direction === 'down' ? 'text-gray-500' : 'text-gray-600'
                }`} data-testid={`trend-${trends.totalDocuments.direction}-totalDocuments`}>
                {getTrendText(trends.totalDocuments)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className={`bg-white ${isMobile ? 'p-4' : 'p-6'} rounded-xl border border-gray-200 hover:border-gray-400 transition-colors duration-200`} data-testid="stats-engagement">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="p-2 bg-gray-50 rounded-lg border border-gray-100">
              <ChartBarIcon className="h-5 w-5 text-black" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Time</p>
              <p className="text-2xl font-semibold text-black mt-1">{formatTime(stats.averageTimeOnPage)}</p>
            </div>
          </div>
          {stats.bounceRate && (
            <div className="flex flex-col items-end">
              <p className="text-xs text-gray-500 font-medium">Bounce</p>
              <p className="text-sm font-semibold text-black mt-0.5">{stats.bounceRate}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

