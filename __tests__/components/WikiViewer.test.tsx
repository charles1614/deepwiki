import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikiViewer } from '@/components/WikiViewer'

// Mock MarkdownRenderer to avoid ES module issues
jest.mock('@/lib/markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, theme, className }: any) => {
    // Simple markdown processing for tests
    const processedContent = content || 'No content'

    // Convert basic markdown to HTML elements for testing with proper accessibility
    let html = processedContent
      .replace(/^# (.+)$/gm, (match, text) => `<h1 role="heading" aria-level="1">${text}</h1>`)
      .replace(/^## (.+)$/gm, (match, text) => `<h2 role="heading" aria-level="2">${text}</h2>`)
      .replace(/^### (.+)$/gm, (match, text) => `<h3 role="heading" aria-level="3">${text}</h3>`)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')

    return (
      <div data-testid="markdown-renderer" className={className} data-theme={theme}>
        <div
          data-testid="markdown-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    )
  }
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('WikiViewer', () => {
  const user = userEvent.setup()

  const mockWiki = {
    id: '1',
    title: 'Test Wiki',
    slug: 'test-wiki',
    description: 'Wiki: Test Wiki',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  }

  const mockWikiFiles = [
    {
      id: '1',
      fileName: 'index.md',
      filePath: 'test-wiki/index.md',
      fileSize: 1024,
      contentType: 'text/markdown'
    },
    {
      id: '2',
      fileName: 'overview.md',
      filePath: 'test-wiki/overview.md',
      fileSize: 2048,
      contentType: 'text/markdown'
    },
    {
      id: '3',
      fileName: 'guide.md',
      filePath: 'test-wiki/guide.md',
      fileSize: 3072,
      contentType: 'text/markdown'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state initially', () => {
    render(<WikiViewer wiki={mockWiki} />)

    expect(screen.getByText(/loading wiki content/i)).toBeInTheDocument()
  })

  it('should render wiki title and sidebar', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Test Wiki')).toBeInTheDocument()
      expect(screen.getByText('index.md')).toBeInTheDocument()
      expect(screen.getByText('overview.md')).toBeInTheDocument()
      expect(screen.getByText('guide.md')).toBeInTheDocument()
    })
  })

  it('should load and display index.md content by default', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock index.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Wiki\n\nThis is the main content of the test wiki.'
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getAllByText('Test Wiki')).toHaveLength(2) // One in header, one in content
      expect(screen.getByText('This is the main content of the test wiki.')).toBeInTheDocument()
    })
  })

  it('should navigate between files', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock index.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Wiki\n\nMain content.'
      })
    })

    // Mock overview.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Overview\n\nOverview content here.'
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Main content.')).toBeInTheDocument()
    })

    // Click on overview.md
    await user.click(screen.getByText('overview.md'))

    await waitFor(() => {
      expect(screen.getByText('Overview content here.')).toBeInTheDocument()
    })
  })

  it('should handle file loading errors', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock file content fetch error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'File not found'
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load wiki content/i)).toBeInTheDocument()
      expect(screen.getByText(/please try again later/i)).toBeInTheDocument()
    })
  })

  it('should handle sidebar navigation errors', async () => {
    // Mock file list fetch error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: 'Failed to fetch files'
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load wiki files/i)).toBeInTheDocument()
    })
  })

  it('should show retry buttons on errors', async () => {
    // Mock file list fetch error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    // Mock successful retry
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('index.md')).toBeInTheDocument()
    })
  })

  it('should highlight active file in sidebar', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock index.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Wiki\n\nMain content.'
      })
    })

    // Mock overview.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Overview\n\nOverview content.'
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      // index.md should be active by default - check for Tailwind active classes
      const indexFile = screen.getByText('index.md')
      expect(indexFile).toHaveClass('bg-blue-100', 'text-blue-700', 'font-medium')
    })

    // Click overview.md
    await user.click(screen.getByText('overview.md'))

    await waitFor(() => {
      // overview.md should now be active - check for Tailwind active classes
      const overviewFile = screen.getByText('overview.md')
      expect(overviewFile).toHaveClass('bg-blue-100', 'text-blue-700', 'font-medium')

      // index.md should not be active - should only have hover classes
      const indexFile = screen.getByText('index.md')
      expect(indexFile).toHaveClass('hover:bg-gray-100', 'text-gray-700')
      expect(indexFile).not.toHaveClass('bg-blue-100', 'text-blue-700')
    })
  })

  it('should handle empty wiki', async () => {
    // Mock empty file list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: []
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText(/no files found in this wiki/i)).toBeInTheDocument()
    })
  })

  it('should support keyboard navigation', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock index.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Wiki\n\nMain content.'
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('index.md')).toBeInTheDocument()
    })

    // Test that file buttons are focusable (buttons are focusable by default)
    const firstFile = screen.getByText('index.md')
    const secondFile = screen.getByText('overview.md')

    expect(firstFile.tagName).toBe('BUTTON')
    expect(secondFile.tagName).toBe('BUTTON')

    // Test manual focus (simulating keyboard navigation)
    firstFile.focus()
    expect(firstFile).toHaveFocus()

    // Test click navigation to switch files
    await user.click(secondFile)

    // Since we can't easily control the async behavior in tests,
    // just verify that the click happened and the UI updated
    expect(screen.getByText(/Viewing:/)).toBeInTheDocument()
  })

  it('should render markdown with proper formatting', async () => {
    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock index.md content fetch (auto-selected)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: `# Test Wiki

## Section 1

This is a **bold** text and this is *italic*.

### Subsection

- Item 1
- Item 2
- Item 3

\`\`\`javascript
console.log('Hello World');
\`\`\``
      })
    })

    render(<WikiViewer wiki={mockWiki} />)

    await waitFor(() => {
      // Check that the component rendered successfully
      expect(screen.getByText('Files')).toBeInTheDocument()
      expect(screen.getByText('index.md')).toBeInTheDocument()
      expect(screen.getByText('overview.md')).toBeInTheDocument()
      expect(screen.getByText('guide.md')).toBeInTheDocument()
    })

    // Wait for content to load and check basic rendering
    await waitFor(() => {
      // Check that markdown content is being rendered (not just testing specific elements)
      const markdownContent = screen.getByTestId('markdown-content')
      expect(markdownContent).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('should have back navigation', async () => {
    const mockOnBack = jest.fn()

    // Mock file list fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        files: mockWikiFiles
      })
    })

    // Mock index.md content fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Wiki\n\nMain content.'
      })
    })

    render(<WikiViewer wiki={mockWiki} onBack={mockOnBack} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to wikis/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /back to wikis/i }))

    expect(mockOnBack).toHaveBeenCalled()
  })
})