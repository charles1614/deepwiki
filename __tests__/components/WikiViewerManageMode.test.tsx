import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikiViewer } from '@/components/WikiViewer'
import { useSearchParams } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}))

// Mock markdown renderer
jest.mock('@/lib/markdown/MarkdownRenderer', () => {
  return {
    MarkdownRenderer: ({ content }: { content: string }) => (
      <div data-testid="markdown-renderer">{content}</div>
    ),
  }
})

const mockWiki = {
  id: 'wiki-1',
  title: 'Test Wiki',
  slug: 'test-wiki',
  description: 'A test wiki',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockFiles = [
  {
    id: 'file-1',
    filename: 'index.md',
    originalName: 'index.md',
    size: 1024,
    url: 'https://example.com/file1',
    uploadedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'file-2',
    filename: 'about.md',
    originalName: 'about.md',
    size: 2048,
    url: 'https://example.com/file2',
    uploadedAt: '2024-01-01T00:00:00Z',
  },
]

describe('WikiViewer - Manage Mode Toggle', () => {
  const mockOnBack = jest.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)

    // Mock fetch API
    global.fetch = jest.fn()
  })

  it('renders in read mode by default', () => {
    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Check that Manage button is visible
    expect(screen.getByText('Manage')).toBeInTheDocument()
    expect(screen.queryByText('Exit Manage')).not.toBeInTheDocument()

    // Check that breadcrumb shows current page (using more specific selector)
    expect(screen.getByText('Home')).toBeInTheDocument()
    // Use the breadcrumb span with specific class
    expect(screen.getByText('Test Wiki', { selector: '.text-gray-900.font-medium' })).toBeInTheDocument()

    // Check that checkboxes are not visible in read mode
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('toggles to manage mode when Manage button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    const manageButton = screen.getByText('Manage')
    await user.click(manageButton)

    // Check that button text changes to Exit Manage
    expect(screen.getByText('Exit Manage')).toBeInTheDocument()
    expect(screen.queryByText('Manage')).not.toBeInTheDocument()

    // Check that checkboxes appear for files
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(mockFiles.length)
  })

  it('toggles back to read mode when Exit Manage button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // First, enable manage mode
    const manageButton = screen.getByText('Manage')
    await user.click(manageButton)

    // Then, exit manage mode
    const exitManageButton = screen.getByText('Exit Manage')
    await user.click(exitManageButton)

    // Check that we're back in read mode
    expect(screen.getByText('Manage')).toBeInTheDocument()
    expect(screen.queryByText('Exit Manage')).not.toBeInTheDocument()

    // Check that checkboxes are gone
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  it('shows breadcrumb navigation correctly', () => {
    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Check breadcrumb items
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Test Wiki')).toBeInTheDocument()

    // Should not show file name initially (no file selected yet)
    expect(screen.queryByText(/index/)).not.toBeInTheDocument()
    expect(screen.queryByText(/about/)).not.toBeInTheDocument()
  })

  it('shows selected file in breadcrumb when file is selected', async () => {
    // Mock successful fetch for file content
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, content: '# Test Content' })
    })

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Wait for file to be selected and content to load
    await waitFor(() => {
      expect(screen.getByText('index')).toBeInTheDocument()
    })

    // Check that breadcrumb shows selected file
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Test Wiki')).toBeInTheDocument()
    expect(screen.getByText('index')).toBeInTheDocument()
  })

  it('handles back navigation correctly', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    const backButton = screen.getByText('Home')
    await user.click(backButton)

    expect(mockOnBack).toHaveBeenCalledTimes(1)
  })

  it('clears file selection when toggling manage mode', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Enable manage mode
    const manageButton = screen.getByText('Manage')
    await user.click(manageButton)

    // Select some files
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    // Toggle back to read mode
    const exitManageButton = screen.getByText('Exit Manage')
    await user.click(exitManageButton)

    // Toggle back to manage mode
    await user.click(screen.getByText('Manage'))

    // Selection should be cleared (checkboxes should be unchecked)
    const newCheckboxes = screen.getAllByRole('checkbox')
    newCheckboxes.forEach(checkbox => {
      expect(checkbox).not.toBeChecked()
    })
  })
})

describe('WikiViewer - Manage Mode Features', () => {
  const mockOnBack = jest.fn()
  const mockSearchParams = new URLSearchParams()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSearchParams as jest.Mock).mockReturnValue(mockSearchParams)
    global.fetch = jest.fn()
  })

  it('shows checkboxes in manage mode', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Enable manage mode
    const manageButton = screen.getByText('Manage')
    await user.click(manageButton)

    // Check that checkboxes are present
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(mockFiles.length)

    // Check that files are still visible
    expect(screen.getByText('index')).toBeInTheDocument()
    expect(screen.getByText('about')).toBeInTheDocument()
  })

  it('allows selecting individual files in manage mode', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Enable manage mode
    const manageButton = screen.getByText('Manage')
    await user.click(manageButton)

    const checkboxes = screen.getAllByRole('checkbox')

    // Select first file
    await user.click(checkboxes[0])
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()

    // Select second file
    await user.click(checkboxes[1])
    expect(checkboxes[1]).toBeChecked()
  })

  it('maintains file selection state during manage mode', async () => {
    const user = userEvent.setup()

    render(
      <WikiViewer
        wiki={mockWiki}
        files={mockFiles}
        onBack={mockOnBack}
      />
    )

    // Enable manage mode
    const manageButton = screen.getByText('Manage')
    await user.click(manageButton)

    // Select files
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    // Check that selections persist
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
  })
})