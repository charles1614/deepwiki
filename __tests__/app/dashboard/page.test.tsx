import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Session } from 'next-auth'
import DashboardPage from '@/app/dashboard/page'

// Mock NextAuth
jest.mock('next-auth/react')

// Mock Next.js router
jest.mock('next/navigation')

// Mock components
jest.mock('@/components/layout/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/layout/WithNavigation', () => ({
  WithNavigation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/components/WikiUpload', () => ({
  WikiUpload: ({ onUploadSuccess }: { onUploadSuccess: () => void }) => (
    <div data-testid="wiki-upload">
      <button onClick={onUploadSuccess}>Mock Upload</button>
    </div>
  )
}))

jest.mock('@/components/WikiList', () => ({
  WikiList: ({ onWikiSelect, onWikiDeleted }: any) => (
    <div data-testid="wiki-list">
      <button onClick={() => onWikiSelect({ slug: 'test-wiki' })}>Select Wiki</button>
      <button onClick={onWikiDeleted}>Delete Wiki</button>
    </div>
  )
}))

// Mock fetch
global.fetch = jest.fn()

describe('DashboardPage', () => {
  const mockPush = jest.fn()
  const mockUseSession = require('next-auth/react').useSession as jest.MockedFunction<any>
  const mockUseRouter = require('next/navigation').useRouter as jest.MockedFunction<any>
  const mockFetch = global.fetch as jest.MockedFunction<any>

  const mockSession: Session = {
    expires: '2024-01-01',
    user: {
      id: '1',
      email: 'test@example.com',
      role: 'USER'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: 'authenticated'
    })

    mockUseRouter.mockReturnValue({
      push: mockPush
    })

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: {
          totalWikis: 5,
          recentUploads: 3,
          totalDocuments: 12
        }
      })
    })
  })

  describe('Enhanced Activity Feed', () => {
    it('displays recent wiki activities in chronological order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: '1',
              type: 'wiki_created',
              wikiTitle: 'Getting Started Guide',
              userEmail: 'john@example.com',
              timestamp: '2024-01-15T10:30:00Z',
              metadata: { slug: 'getting-started' }
            },
            {
              id: '2',
              type: 'wiki_updated',
              wikiTitle: 'API Documentation',
              userEmail: 'jane@example.com',
              timestamp: '2024-01-15T09:15:00Z',
              metadata: { slug: 'api-docs', changes: 5 }
            },
            {
              id: '3',
              type: 'wiki_deleted',
              wikiTitle: 'Old Documentation',
              userEmail: 'admin@example.com',
              timestamp: '2024-01-14T16:45:00Z',
              metadata: { reason: 'outdated' }
            }
          ]
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Recent Activity')).toBeInTheDocument()
        expect(screen.getByText('Getting Started Guide')).toBeInTheDocument()
        expect(screen.getByText('API Documentation')).toBeInTheDocument()
        expect(screen.getByText('Old Documentation')).toBeInTheDocument()
      })
    })

    it('shows activity type icons and colors correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: '1',
              type: 'wiki_created',
              wikiTitle: 'New Guide',
              userEmail: 'user@example.com',
              timestamp: '2024-01-15T10:00:00Z'
            },
            {
              id: '2',
              type: 'wiki_updated',
              wikiTitle: 'Updated Guide',
              userEmail: 'user@example.com',
              timestamp: '2024-01-15T09:00:00Z'
            }
          ]
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        const createdIcon = screen.getByTestId('activity-icon-wiki_created')
        const updatedIcon = screen.getByTestId('activity-icon-wiki_updated')

        expect(createdIcon).toHaveClass('text-green-600')
        expect(updatedIcon).toHaveClass('text-blue-600')
      })
    })

    it('displays relative timestamps for activities', async () => {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          activities: [
            {
              id: '1',
              type: 'wiki_created',
              wikiTitle: 'Recent Guide',
              userEmail: 'user@example.com',
              timestamp: twoHoursAgo.toISOString()
            },
            {
              id: '2',
              type: 'wiki_updated',
              wikiTitle: 'Older Guide',
              userEmail: 'user@example.com',
              timestamp: oneDayAgo.toISOString()
            }
          ]
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('2 hours ago')).toBeInTheDocument()
        expect(screen.getByText('1 day ago')).toBeInTheDocument()
      })
    })

    it('filters activities by type when filter buttons are clicked', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          activities: [
            { id: '1', type: 'wiki_created', wikiTitle: 'New Wiki', userEmail: 'user@example.com', timestamp: '2024-01-15T10:00:00Z' },
            { id: '2', type: 'wiki_updated', wikiTitle: 'Updated Wiki', userEmail: 'user@example.com', timestamp: '2024-01-15T09:00:00Z' }
          ]
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('New Wiki')).toBeInTheDocument()
        expect(screen.getByText('Updated Wiki')).toBeInTheDocument()
      })

      // Click filter for "Created" only
      fireEvent.click(screen.getByRole('button', { name: 'Show Created Only' }))

      await waitFor(() => {
        expect(screen.getByText('New Wiki')).toBeInTheDocument()
        expect(screen.queryByText('Updated Wiki')).not.toBeInTheDocument()
      })
    })

    it('shows empty state when no activities exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ activities: [] })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('No recent activity')).toBeInTheDocument()
        expect(screen.getByText('Start by creating or updating wikis to see activity here.')).toBeInTheDocument()
      })
    })
  })

  describe('Enhanced Quick Actions', () => {
    it('displays expanded quick action cards with descriptions', () => {
      render(<DashboardPage />)

      expect(screen.getByTestId('action-view-wikis')).toBeInTheDocument()
      expect(screen.getByTestId('action-upload-wiki')).toBeInTheDocument()
      expect(screen.getByText('Browse your documentation')).toBeInTheDocument()
      expect(screen.getByText('Add documentation')).toBeInTheDocument()
    })

    it('shows additional quick actions for admin users', () => {
      mockUseSession.mockReturnValue({
        data: {
          ...mockSession,
          user: { ...mockSession.user, role: 'ADMIN' }
        },
        status: 'authenticated'
      })

      render(<DashboardPage />)

      expect(screen.getByTestId('action-manage-users')).toBeInTheDocument()
      expect(screen.getByTestId('action-system-settings')).toBeInTheDocument()
      expect(screen.getByText('Manage user accounts and permissions')).toBeInTheDocument()
    })

    it('tracks quick action usage analytics', async () => {
      render(<DashboardPage />)

      fireEvent.click(screen.getByTestId('action-view-wikis'))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/analytics/quick-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'view_wikis',
            userId: '1',
            timestamp: expect.any(String)
          })
        })
      })
    })

    it('shows personalized quick actions based on user behavior', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          personalizedActions: [
            {
              id: 'recent-wiki',
              title: 'Continue Editing',
              description: 'Getting Started Guide',
              icon: 'document-text',
              action: { type: 'edit', wikiId: '1' }
            }
          ]
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Continue Editing')).toBeInTheDocument()
        expect(screen.getByText('Getting Started Guide')).toBeInTheDocument()
      })
    })
  })

  describe('Improved Statistics Display', () => {
    it('shows animated stat cards with trend indicators', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          stats: {
            totalWikis: 15,
            recentUploads: 8,
            totalDocuments: 42,
            weeklyActiveUsers: 25
          },
          trends: {
            totalWikis: { direction: 'up', percentage: 15 },
            recentUploads: { direction: 'down', percentage: 5 },
            totalDocuments: { direction: 'up', percentage: 22 },
            weeklyActiveUsers: { direction: 'up', percentage: 8 }
          }
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument() // totalWikis
        expect(screen.getByTestId('trend-up-totalWikis')).toBeInTheDocument()
        expect(screen.getByText('+15%')).toBeInTheDocument()
      })
    })

    it('displays interactive charts for wiki activity over time', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          chartData: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            datasets: [
              {
                label: 'Wiki Views',
                data: [120, 145, 167, 189, 203],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)'
              },
              {
                label: 'New Wikis',
                data: [3, 5, 2, 8, 4],
                borderColor: 'rgb(34, 197, 94)',
                backgroundColor: 'rgba(34, 197, 94, 0.1)'
              }
            ]
          }
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByTestId('activity-chart')).toBeInTheDocument()
        expect(screen.getByText('Wiki Activity Over Time')).toBeInTheDocument()
      })
    })

    it('shows user engagement metrics', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          stats: {
            totalWikis: 10,
            recentUploads: 3,
            totalDocuments: 25,
            engagement: {
              averageTimeOnPage: 245, // seconds
              bounceRate: 32, // percentage
              topPages: ['getting-started', 'api-docs', 'tutorial']
            }
          }
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('4m 5s')).toBeInTheDocument() // average time
        expect(screen.getByText('32%')).toBeInTheDocument() // bounce rate
        expect(screen.getByText('getting-started')).toBeInTheDocument()
      })
    })
  })

  describe('Personalized Welcome Experience', () => {
    it('shows personalized greeting based on time of day', () => {
      // Mock current time to be morning
      const mockDate = new Date('2024-01-15T09:00:00Z')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate)

      render(<DashboardPage />)

      expect(screen.getByText('Good morning, test!')).toBeInTheDocument()
      expect(screen.getByText(/Here's your wiki activity overview/)).toBeInTheDocument()
    })

    it('displays achievement badges and milestones', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          achievements: [
            { id: 'first-wiki', title: 'First Wiki Created', description: 'Created your first wiki', earnedAt: '2024-01-10T10:00:00Z', icon: 'star' },
            { id: 'power-user', title: 'Power User', description: 'Created 10+ wikis', earnedAt: '2024-01-14T15:30:00Z', icon: 'lightning-bolt' }
          ],
          progress: {
            nextAchievement: { title: 'Wiki Master', description: 'Create 25 wikis', progress: 15, total: 25 }
          }
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('First Wiki Created')).toBeInTheDocument()
        expect(screen.getByText('Power User')).toBeInTheDocument()
        expect(screen.getByText('Wiki Master')).toBeInTheDocument()
        expect(screen.getByText('15/25')).toBeInTheDocument()
      })
    })

    it('shows quick tips and onboarding hints for new users', async () => {
      mockUseSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated'
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isReturningUser: false,
          tips: [
            { id: '1', title: 'Start with your first wiki', content: 'Click Upload New Wiki to get started' },
            { id: '2', title: 'Use markdown formatting', content: 'Format your docs with markdown for better readability' }
          ]
        })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Welcome to DeepWiki!')).toBeInTheDocument()
        expect(screen.getByText('Start with your first wiki')).toBeInTheDocument()
        expect(screen.getByText('Click Upload New Wiki to get started')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility and Responsive Design', () => {
    it('is keyboard navigable and has proper ARIA labels', () => {
      render(<DashboardPage />)

      const viewWikisButton = screen.getByTestId('action-view-wikis')
      viewWikisButton.focus()
      expect(viewWikisButton).toHaveFocus()

      fireEvent.keyDown(viewWikisButton, { key: 'Enter' })
      expect(mockPush).toHaveBeenCalledWith('/wiki')
    })

    it('announces important changes to screen readers', async () => {
      render(<DashboardPage />)

      // Trigger stats update
      fireEvent.click(screen.getByTestId('refresh-stats'))

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Statistics updated')
      })
    })

    it('adapts layout for mobile devices', () => {
      // Mock mobile viewport
      global.innerWidth = 375
      global.dispatchEvent(new Event('resize'))

      render(<DashboardPage />)

      const statsGrid = screen.getByTestId('stats-grid')
      expect(statsGrid).toHaveClass('grid-cols-1')
    })
  })

  describe('Error Handling and Loading States', () => {
    it('shows loading skeletons while fetching data', () => {
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

      render(<DashboardPage />)

      expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
      expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument()
    })

    it('displays error messages when API calls fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Unable to load dashboard data')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      })
    })

    it('allows retrying failed requests', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stats: { totalWikis: 5 } })
      })

      render(<DashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Unable to load dashboard data')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
    })
  })
})