import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardStats } from '@/components/DashboardStats'

// Mock fetch
global.fetch = jest.fn()

describe('DashboardStats Mobile Responsiveness', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: {
          totalWikis: 15,
          recentUploads: 8,
          totalDocuments: 42,
          averageTimeOnPage: 245,
          bounceRate: 32
        },
        trends: {
          totalWikis: { direction: 'up', percentage: 15 },
          recentUploads: { direction: 'down', percentage: 5 },
          totalDocuments: { direction: 'up', percentage: 22 }
        }
      })
    })
  })

  it('adapts layout for mobile devices', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667
    })

    render(<DashboardStats />)

    await waitFor(() => {
      const statsGrid = screen.getByTestId('stats-grid')
      expect(statsGrid).toHaveClass('grid-cols-1')
    })
  })

  it('provides touch-friendly tap targets for mobile', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375
    })

    render(<DashboardStats />)

    await waitFor(() => {
      const totalWikisCard = screen.getByTestId('stats-total-wikis')
      const recentUploadsCard = screen.getByTestId('stats-recent-uploads')
      const totalDocumentsCard = screen.getByTestId('stats-total-documents')
      const engagementCard = screen.getByTestId('stats-engagement')

      expect(totalWikisCard).toHaveClass('p-4')
      expect(recentUploadsCard).toHaveClass('p-4')
      expect(totalDocumentsCard).toHaveClass('p-4')
      expect(engagementCard).toHaveClass('p-4')
    })
  })

  it('maintains readability on small screens', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      const statValues = screen.getAllByRole('generic').filter(el =>
        el.textContent?.match(/^\d+/)
      )
      statValues.forEach(value => {
        expect(value).toHaveClass('text-2xl') // Large text for mobile readability
      })
    })
  })

  it('optimizes trend indicators for mobile', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      const trendIcons = screen.getAllByTestId(/^trend-/)
      trendIcons.forEach(icon => {
        expect(icon).toHaveClass('text-sm') // Readable trend text on mobile
      })
    })
  })
})