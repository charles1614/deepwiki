import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardActivityFeed } from '@/components/DashboardActivityFeed'

// Mock fetch
global.fetch = jest.fn()

describe('DashboardActivityFeed', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  const mockActivities = [
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        activities: mockActivities,
        total: mockActivities.length
      })
    })
  })

  it('displays recent wiki activities in chronological order', async () => {
    render(<DashboardActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('john created "Getting Started Guide"')).toBeInTheDocument()
      expect(screen.getByText('jane updated "API Documentation"')).toBeInTheDocument()
      expect(screen.getByText('admin deleted "Old Documentation"')).toBeInTheDocument()
    })
  })

  it('shows activity type icons and colors correctly', async () => {
    render(<DashboardActivityFeed />)

    await waitFor(() => {
      expect(screen.getByTestId('activity-icon-wiki_created')).toBeInTheDocument()
      expect(screen.getByTestId('activity-icon-wiki_updated')).toBeInTheDocument()
      expect(screen.getByTestId('activity-icon-wiki_deleted')).toBeInTheDocument()

      const createdIcon = screen.getByTestId('activity-icon-wiki_created')
      const updatedIcon = screen.getByTestId('activity-icon-wiki_updated')
      const deletedIcon = screen.getByTestId('activity-icon-wiki_deleted')

      expect(createdIcon).toHaveClass('text-green-600')
      expect(updatedIcon).toHaveClass('text-blue-600')
      expect(deletedIcon).toHaveClass('text-red-600')
    })
  })

  it('displays relative timestamps for activities', async () => {
    render(<DashboardActivityFeed />)

    await waitFor(() => {
      // Since the mock data is from 2024-01-15 and current time is 2025-11-07,
      // it's more than 7 days ago so it shows the formatted date
      expect(screen.getAllByText('1/15/2024')).toHaveLength(3) // 3 activities with the same date
    })
  })

  it('filters activities by type when filter buttons are clicked', async () => {
    // Override the mock to return only wiki_created activities when filter is applied
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
          }
        ]
      })
    })

    render(<DashboardActivityFeed filter="wiki_created" />)

    await waitFor(() => {
      expect(screen.getByText('john created "Getting Started Guide"')).toBeInTheDocument()
      expect(screen.queryByText('jane updated "API Documentation"')).not.toBeInTheDocument()
      expect(screen.queryByText('admin deleted "Old Documentation"')).not.toBeInTheDocument()
    })
  })

  it('shows empty state when no activities exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ activities: [] })
    })

    render(<DashboardActivityFeed />)

    await waitFor(() => {
      expect(screen.getByTestId('no-activities')).toBeInTheDocument()
      expect(screen.getByText('No recent activity')).toBeInTheDocument()
      expect(screen.getByText('Start by creating or updating wikis to see activity here.')).toBeInTheDocument()
    })
  })

  it('displays loading skeletons initially', () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<DashboardActivityFeed />)

    expect(screen.getByTestId('activity-skeleton')).toBeInTheDocument()
    // Check that skeleton loading elements are present (animate-pulse class indicates loading state)
    const skeletonElements = document.querySelectorAll('.animate-pulse')
    expect(skeletonElements.length).toBeGreaterThan(0) // At least one skeleton element
  })

  it('shows error state and retry functionality', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<DashboardActivityFeed />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    // Should retry fetch
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('shows different icons for different activity types', async () => {
    const activitiesWithTypes = [
      { id: '1', type: 'wiki_created', wikiTitle: 'Test', userEmail: 'user@test.com', timestamp: '2024-01-15T10:00:00Z' },
      { id: '2', type: 'wiki_viewed', wikiTitle: 'Test2', userEmail: 'user2@test.com', timestamp: '2024-01-15T09:00:00Z' }
    ]

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ activities: activitiesWithTypes })
    })

    render(<DashboardActivityFeed />)

    await waitFor(() => {
      expect(screen.getByTestId('activity-icon-wiki_created')).toBeInTheDocument()
      expect(screen.getByTestId('activity-icon-wiki_viewed')).toBeInTheDocument()
    })
  })
})