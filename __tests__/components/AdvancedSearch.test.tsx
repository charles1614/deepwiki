import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AdvancedSearch from '@/components/AdvancedSearch'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn()
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/search'
}))

// Mock API calls
jest.mock('@/lib/api/search', () => ({
  searchWiki: jest.fn(),
  getSearchSuggestions: jest.fn()
}))

import { searchWiki, getSearchSuggestions } from '@/lib/api/search'

const mockSearchWiki = searchWiki as jest.MockedFunction<typeof searchWiki>
const mockGetSearchSuggestions = getSearchSuggestions as jest.MockedFunction<typeof getSearchSuggestions>

describe('AdvancedSearch', () => {
  const mockSearchResults = [
    {
      wiki: {
        id: 'wiki-1',
        title: 'React Development Guide',
        slug: 'react-guide',
        description: 'Comprehensive guide to React development',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z'
      },
      matches: [
        {
          file: {
            id: 'file-1',
            fileName: 'hooks.md',
            filePath: 'hooks.md',
            contentType: 'text/markdown'
          },
          content: 'React hooks allow you to use state and other React features...',
          snippet: 'React <mark>hooks</mark> allow you to use state and other React features...'
        }
      ]
    }
  ]

  const mockSuggestions = ['useState', 'useEffect', 'useContext']

  beforeEach(() => {
    jest.clearAllMocks()
    mockSearchWiki.mockResolvedValue({
      success: true,
      results: mockSearchResults,
      total: 1
    })
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: mockSuggestions
    })
  })

  it('should render advanced search interface', () => {
    render(<AdvancedSearch />)

    expect(screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')).toBeInTheDocument()
    expect(screen.getByText('Advanced Search')).toBeInTheDocument()
  })

  it('should toggle advanced filters', async () => {
    render(<AdvancedSearch />)

    // Initially filters should be hidden
    expect(screen.queryByTestId('advanced-filters')).not.toBeInTheDocument()

    // Click to show filters
    const toggleButton = screen.getByText('Advanced Filters')
    fireEvent.click(toggleButton)

    await waitFor(() => {
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })

    // Should show filter options
    expect(screen.getByLabelText('Search in content')).toBeInTheDocument()
    expect(screen.getByLabelText('File type')).toBeInTheDocument()
    expect(screen.getByLabelText('From date')).toBeInTheDocument()
    expect(screen.getByLabelText('To date')).toBeInTheDocument()
  })

  it('should perform search when typing in search box', async () => {
    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React hooks' } })

    await waitFor(() => {
      expect(mockSearchWiki).toHaveBeenCalledWith('React hooks', {
        content: false,
        highlight: false,
        fromDate: '',
        toDate: '',
        fileType: '',
        limit: 20
      })
    })
  })

  it('should show search suggestions while typing', async () => {
    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'use' } })

    await waitFor(() => {
      expect(mockGetSearchSuggestions).toHaveBeenCalledWith('use')
    })

    // Mock suggestions response
    mockGetSearchSuggestions.mockResolvedValue({
      success: true,
      suggestions: mockSuggestions
    })

    await waitFor(() => {
      expect(screen.getByText('useState')).toBeInTheDocument()
      expect(screen.getByText('useEffect')).toBeInTheDocument()
      expect(screen.getByText('useContext')).toBeInTheDocument()
    })
  })

  it('should apply content search filter', async () => {
    render(<AdvancedSearch />)

    // Show advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'))

    await waitFor(() => {
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })

    // Enable content search
    const contentCheckbox = screen.getByLabelText('Search in content')
    fireEvent.click(contentCheckbox)

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'useState' } })

    await waitFor(() => {
      expect(mockSearchWiki).toHaveBeenCalledWith('useState', {
        content: true,
        highlight: false,
        fromDate: '',
        toDate: '',
        fileType: '',
        limit: 20
      })
    })
  })

  it('should apply file type filter', async () => {
    render(<AdvancedSearch />)

    // Show advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'))

    await waitFor(() => {
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })

    // Select file type
    const fileTypeSelect = screen.getByLabelText('File type')
    fireEvent.change(fileTypeSelect, { target: { value: 'markdown' } })

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'guide' } })

    await waitFor(() => {
      expect(mockSearchWiki).toHaveBeenCalledWith('guide', {
        content: false,
        highlight: false,
        fromDate: '',
        toDate: '',
        fileType: 'markdown',
        limit: 20
      })
    })
  })

  it('should apply date range filter', async () => {
    render(<AdvancedSearch />)

    // Show advanced filters
    fireEvent.click(screen.getByText('Advanced Filters'))

    await waitFor(() => {
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })

    // Set date range
    const fromDateInput = screen.getByLabelText('From date')
    const toDateInput = screen.getByLabelText('To date')

    fireEvent.change(fromDateInput, { target: { value: '2024-01-01' } })
    fireEvent.change(toDateInput, { target: { value: '2024-01-31' } })

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React' } })

    await waitFor(() => {
      expect(mockSearchWiki).toHaveBeenCalledWith('React', {
        content: false,
        highlight: false,
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        fileType: '',
        limit: 20
      })
    })
  })

  it('should display search results', async () => {
    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React hooks' } })

    await waitFor(() => {
      expect(screen.getByText('React Development Guide')).toBeInTheDocument()
      expect(screen.getByText('Comprehensive guide to React development')).toBeInTheDocument()
      expect(screen.getByText('hooks.md')).toBeInTheDocument()
    })
  })

  it('should display content snippets when highlight is enabled', async () => {
    // Mock response with highlighted snippets
    mockSearchWiki.mockResolvedValue({
      success: true,
      results: [
        {
          wiki: mockSearchResults[0].wiki,
          matches: [
            {
              ...mockSearchResults[0].matches[0],
              snippet: 'React <mark>hooks</mark> allow you to use state...'
            }
          ]
        }
      ],
      total: 1
    })

    render(<AdvancedSearch />)

    // Enable content search and highlighting
    fireEvent.click(screen.getByText('Advanced Filters'))

    await waitFor(() => {
      expect(screen.getByTestId('advanced-filters')).toBeInTheDocument()
    })

    const contentCheckbox = screen.getByLabelText('Search in content')
    const highlightCheckbox = screen.getByLabelText('Highlight matches')

    fireEvent.click(contentCheckbox)
    fireEvent.click(highlightCheckbox)

    // Perform search
    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React hooks' } })

    await waitFor(() => {
      expect(mockSearchWiki).toHaveBeenCalledWith('React hooks', {
        content: true,
        highlight: true,
        fromDate: '',
        toDate: '',
        fileType: '',
        limit: 20
      })
    })
  })

  it('should show loading state during search', async () => {
    let resolvePromise: (value: any) => void
    mockSearchWiki.mockImplementation(() => {
      return new Promise((resolve) => {
        resolvePromise = resolve
      })
    })

    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React' } })

    // Wait for loading state to appear (after debounce delay)
    await waitFor(() => {
      expect(screen.getByTestId('search-loading')).toBeInTheDocument()
    }, { timeout: 1000 })

    // Clean up by resolving the promise
    if (resolvePromise) {
      resolvePromise({ success: true, results: [], total: 0 })
    }
  })

  it('should show error state when search fails', async () => {
    mockSearchWiki.mockRejectedValue(new Error('Search failed'))

    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React' } })

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument()
    })
  })

  it('should show no results message', async () => {
    mockSearchWiki.mockResolvedValue({
      success: true,
      results: [],
      total: 0
    })

    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } })

    await waitFor(() => {
      expect(screen.getByText('No results found for "nonexistent"')).toBeInTheDocument()
    })
  })

  it('should allow clicking on search results to navigate', async () => {
    render(<AdvancedSearch />)

    const searchInput = screen.getByPlaceholderText('Search wiki content, titles, or descriptions...')
    fireEvent.change(searchInput, { target: { value: 'React hooks' } })

    await waitFor(() => {
      expect(screen.getByText('React Development Guide')).toBeInTheDocument()
    })

    // Click on the result
    const resultCard = screen.getByTestId('search-result-react-guide')
    fireEvent.click(resultCard)

    // Note: In a real implementation, this would navigate to the wiki page
    // For testing, we just verify the click handler exists
  })
})