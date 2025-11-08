import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DashboardStats } from '@/components/DashboardStats'

// Mock fetch
global.fetch = jest.fn()

describe('DashboardStats', () => {
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

  it('displays statistics with trend indicators', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('15')).toBeInTheDocument() // totalWikis
      expect(screen.getByText('8')).toBeInTheDocument() // recentUploads
      expect(screen.getByText('42')).toBeInTheDocument() // totalDocuments
      expect(screen.getByText('4m 5s')).toBeInTheDocument() // average time
      expect(screen.getByText('Bounce: 32%')).toBeInTheDocument() // bounce rate
    })
  })

  it('shows upward trend indicators correctly', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByTestId('trend-up-totalWikis')).toBeInTheDocument()
      expect(screen.getByText('+15%')).toBeInTheDocument()
      expect(screen.getByTestId('trend-up-totalDocuments')).toBeInTheDocument()
      expect(screen.getByText('+22%')).toBeInTheDocument()
    })
  })

  it('shows downward trend indicators correctly', async () => {
    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByTestId('trend-down-recentUploads')).toBeInTheDocument()
      expect(screen.getByText('-5%')).toBeInTheDocument()
    })
  })

  it('displays loading skeletons initially', () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))

    render(<DashboardStats />)

    expect(screen.getByTestId('stats-skeleton')).toBeInTheDocument()
    // Check that we have loading skeleton elements (gray divs with animate-pulse)
    const skeletonCards = document.querySelectorAll('.animate-pulse')
    expect(skeletonCards).toHaveLength(4) // 4 skeleton cards
  })

  it('shows error state when API fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('Unable to load statistics')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }))

    // Should retry fetch
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('formats time correctly', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        stats: {
          totalWikis: 1,
          recentUploads: 1,
          totalDocuments: 1,
          averageTimeOnPage: 60, // 1 minute
          bounceRate: 25
        }
      })
    })

    render(<DashboardStats />)

    await waitFor(() => {
      expect(screen.getByText('1m 0s')).toBeInTheDocument()
    })
  })
})