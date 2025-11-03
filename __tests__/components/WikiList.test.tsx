import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikiList } from '@/components/WikiList'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('WikiList', () => {
  const user = userEvent.setup()

  const mockWikis = [
    {
      id: '1',
      title: 'Documentation Wiki',
      slug: 'documentation-wiki',
      description: 'Wiki: Documentation Wiki',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      _count: { files: 5 }
    },
    {
      id: '2',
      title: 'Project Wiki',
      slug: 'project-wiki',
      description: 'Wiki: Project Wiki',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      _count: { files: 3 }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    render(<WikiList onWikiSelect={jest.fn()} />)

    expect(screen.getByText(/loading wikis/i)).toBeInTheDocument()
  })

  it('should render wikis in block style', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: mockWikis
      })
    })

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Documentation Wiki')).toBeInTheDocument()
      expect(screen.getByText('Project Wiki')).toBeInTheDocument()
    })

    // Check block-style layout
    expect(screen.getByText('Documentation Wiki')).toBeInTheDocument()
    expect(screen.getByText('Project Wiki')).toBeInTheDocument()
    expect(screen.getByText('Wiki: Documentation Wiki')).toBeInTheDocument()
    expect(screen.getByText('Wiki: Project Wiki')).toBeInTheDocument()
  })

  it('should render file count for each wiki', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: mockWikis
      })
    })

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('5 files')).toBeInTheDocument()
      expect(screen.getByText('3 files')).toBeInTheDocument()
    })
  })

  it('should handle empty wiki list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: []
      })
    })

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/no wikis found/i)).toBeInTheDocument()
      expect(screen.getByText(/upload your first wiki to get started/i)).toBeInTheDocument()
    })
  })

  it('should call onWikiSelect when wiki is clicked', async () => {
    const mockOnWikiSelect = jest.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: mockWikis
      })
    })

    render(<WikiList onWikiSelect={mockOnWikiSelect} />)

    await waitFor(() => {
      expect(screen.getByText('Documentation Wiki')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Documentation Wiki'))

    expect(mockOnWikiSelect).toHaveBeenCalledWith(mockWikis[0])
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Failed to fetch wikis'
      })
    })

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load wikis/i)).toBeInTheDocument()
      expect(screen.getByText(/please try again later/i)).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load wikis/i)).toBeInTheDocument()
    })
  })

  it('should show retry button on error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    // Mock successful retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: [mockWikis[0]]
      })
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('Documentation Wiki')).toBeInTheDocument()
    })
  })

  it('should format dates correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: [mockWikis[0]]
      })
    })

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      // Check for the actual date format used by the component
      expect(screen.getByText(/created Jan 1, 2024/i)).toBeInTheDocument()
    })
  })

  it('should have accessible wiki blocks', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: mockWikis
      })
    })

    render(<WikiList onWikiSelect={jest.fn()} />)

    await waitFor(() => {
      // Check for proper ARIA labels and roles
      expect(screen.getByRole('button', { name: /documentation wiki/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /project wiki/i })).toBeInTheDocument()
    })

    // Test that wiki blocks are focusable (they should have proper tabindex)
    const firstWiki = screen.getByRole('button', { name: /documentation wiki/i })
    expect(firstWiki.tagName).toBe('BUTTON')

    // Test manual focus to verify it works
    firstWiki.focus()
    expect(firstWiki).toHaveFocus()
  })

  it('should allow refreshing the list', async () => {
    const mockOnWikiSelect = jest.fn()

    // First call returns empty
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: []
      })
    })

    render(<WikiList onWikiSelect={mockOnWikiSelect} />)

    await waitFor(() => {
      expect(screen.getByText(/no wikis found/i)).toBeInTheDocument()
    })

    // Mock refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i })

    // Second call returns data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        wikis: [mockWikis[0]]
      })
    })

    await user.click(refreshButton)

    await waitFor(() => {
      expect(screen.getByText('Documentation Wiki')).toBeInTheDocument()
    })
  })
})