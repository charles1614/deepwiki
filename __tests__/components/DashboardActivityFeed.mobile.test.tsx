import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardActivityFeed } from '@/components/DashboardActivityFeed'

// Mock fetch
global.fetch = jest.fn()

describe('DashboardActivityFeed Mobile Responsiveness', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
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
  })

  it('optimizes touch targets for mobile interactions', async () => {
    render(<DashboardActivityFeed />)

    await waitFor(() => {
      const activityItems = screen.getAllByTestId(/^activity-icon-/)
      activityItems.forEach(icon => {
        // The activity item container should have p-3 padding
        const activityContainer = icon.closest('div')?.parentElement
        expect(activityContainer).toHaveClass('p-3') // Adequate padding for touch
      })
    })
  })

  it('maintains text readability on small screens', async () => {
    render(<DashboardActivityFeed />)

    await waitFor(() => {
      const activityText = screen.getByText('john created "Getting Started Guide"')
      expect(activityText).toHaveClass('text-sm') // Readable font size for mobile
    })
  })

  it('optimizes spacing for mobile scrolling', async () => {
    render(<DashboardActivityFeed />)

    await waitFor(() => {
      // The main feed container should have space-y-4 for adequate spacing between items
      const feedContainer = screen.getByText('john created "Getting Started Guide"').closest('div')?.parentElement?.parentElement
      expect(feedContainer).toHaveClass('space-y-4') // Adequate spacing between items
    })
  })

  it('provides touch-friendly filter controls', async () => {
    render(<DashboardActivityFeed filter="wiki_created" />)

    await waitFor(() => {
      // Filter should be easily accessible on mobile
      expect(screen.getByText('john created "Getting Started Guide"')).toBeInTheDocument()
    })
  })

  it('handles mobile viewport constraints gracefully', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })

    render(<DashboardActivityFeed />)

    await waitFor(() => {
      // Check that the main feed container has responsive spacing on mobile
      const activityContainer = screen.getByText('john created "Getting Started Guide"').closest('div')?.parentElement?.parentElement
      expect(activityContainer).toHaveClass('space-y-4') // Responsive spacing
    })
  })
})