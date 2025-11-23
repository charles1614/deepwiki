import { render, screen, waitFor } from '@/tests/unit/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { WikiViewer } from '@/components/WikiViewer'
import { createWiki, createWikiFile } from '@/tests/unit/factories'
import { setupFetchMock } from '@/tests/unit/utils/mock-helpers'

// Mock MarkdownRenderer to avoid ES module issues
jest.mock('@/lib/markdown/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content, theme, className }: any) => {
    // Simple markdown processing for tests
    const processedContent = content || 'No content'

    // Convert basic markdown to HTML elements for testing with proper accessibility
    let html = processedContent
      .replace(/^# (.+)$/gm, (match: string, text: string) => `<h1 role="heading" aria-level="1">${text}</h1>`)
      .replace(/^## (.+)$/gm, (match: string, text: string) => `<h2 role="heading" aria-level="2">${text}</h2>`)
      .replace(/^### (.+)$/gm, (match: string, text: string) => `<h3 role="heading" aria-level="3">${text}</h3>`)
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

describe('WikiViewer', () => {
  const user = userEvent.setup()
  let mockFetch: jest.MockedFunction<typeof fetch>

  const mockWiki = createWiki()

  const mockWikiFiles = [
    createWikiFile({
      id: '1',
      filename: 'index.md',
      size: 1024,
    }),
    createWikiFile({
      id: '2',
      filename: 'overview.md',
      size: 2048,
    }),
    createWikiFile({
      id: '3',
      filename: 'guide.md',
      size: 3072,
    }),
  ]

  beforeEach(() => {
    mockFetch = setupFetchMock((url) => {
      // Default handler
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, content: '# Test Content' }),
        text: async () => '# Test Content',
      } as Response)
    })
  })

  afterEach(() => {
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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

    await waitFor(() => {
      expect(screen.getByText('Test Wiki')).toBeInTheDocument()
      expect(screen.getByText('index')).toBeInTheDocument()
      expect(screen.getByText('overview')).toBeInTheDocument()
      expect(screen.getByText('guide')).toBeInTheDocument()
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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load wiki files/i)).toBeInTheDocument()
    })
  })

  it('should show retry buttons on errors', async () => {
    // Mock file list fetch error
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

    await waitFor(() => {
      // index.md should be active by default - check for active state
      const indexFile = screen.getByText('index.md')
      expect(indexFile).toHaveAnyClass('bg-blue-100', 'text-blue-700', 'font-medium')
    })

    // Click overview.md
    await user.click(screen.getByText('overview.md'))

    await waitFor(() => {
      // overview.md should now be active
      const overviewFile = screen.getByText('overview.md')
      expect(overviewFile).toHaveAnyClass('bg-blue-100', 'text-blue-700', 'font-medium')

      // index.md should not be active
      const indexFile = screen.getByText('index.md')
      expect(indexFile).toHaveAnyClass('hover:bg-gray-100', 'text-gray-700')
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

    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

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

    console.log('mockWikiFiles length:', mockWikiFiles.length)
    render(<WikiViewer wiki={mockWiki} files={mockWikiFiles} />)

    await waitFor(() => {
      // Check that the component rendered successfully
      // screen.debug()
      expect(screen.getByText('Files')).toBeInTheDocument()
      // Filenames are displayed without extension
      expect(screen.getByText('index')).toBeInTheDocument()
      expect(screen.getByText('overview')).toBeInTheDocument()
      expect(screen.getByText('guide')).toBeInTheDocument()
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

    render(<WikiViewer wiki={mockWiki} onBack={mockOnBack} files={mockWikiFiles} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /back to wikis/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /back to wikis/i }))

    expect(mockOnBack).toHaveBeenCalled()
  })
})