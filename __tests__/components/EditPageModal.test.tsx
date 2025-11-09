import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditPageModal } from '@/components/EditPageModal'
import { WikiFile } from '@/components/WikiViewer'

// Mock fetch for API calls
global.fetch = jest.fn()

const mockWiki = {
  id: 'wiki-1',
  title: 'Test Wiki',
  slug: 'test-wiki',
  description: 'A test wiki',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
}

const mockFile: WikiFile = {
  id: 'file-1',
  filename: 'test-page.md',
  originalName: 'test-page.md',
  size: 1024,
  url: 'https://example.com/file1',
  uploadedAt: '2024-01-01T00:00:00Z',
}

const mockOnClose = jest.fn()
const mockOnPageUpdated = jest.fn()

describe('EditPageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when open with existing page content', async () => {
    // Mock successful page content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Page\n\nThis is test content.'
      })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument()
    })

    // Check textarea content
    const contentTextarea = screen.getByLabelText(/Page Content/)
    expect(contentTextarea).toHaveValue('# Test Page\n\nThis is test content.')

    expect(screen.getByDisplayValue('test-page.md')).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={false}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    expect(screen.queryByText('Edit Page')).not.toBeInTheDocument()
  })

  it('loads existing page content on mount', async () => {
    const mockContent = '# Existing Page\n\nThis is existing content with **bold** text.'

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: mockContent
      })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wiki/test-wiki/pages/test-page.md'
      )
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Page')).toBeInTheDocument()
    })

    // Check textarea content
    const contentTextarea = screen.getByLabelText(/Page Content/)
    expect(contentTextarea).toHaveValue(mockContent)
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()

    // Mock page content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Page\n\nContent here'
      })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument()
    })

    // Clear title and try to submit
    const titleInput = screen.getByLabelText(/Page Title/)
    await user.clear(titleInput)
    await user.click(screen.getByText('Save Changes'))

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Page title is required')).toBeInTheDocument()
    })
  })

  it('updates page successfully', async () => {
    const user = userEvent.setup()

    // Mock initial content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Original Title\n\nOriginal content'
      })
    })

    // Mock successful update
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'file-1',
          filename: 'test-page.md',
          versionId: 'version-2'
        }
      })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument()
    })

    // Update title and content
    const titleInput = screen.getByLabelText(/Page Title/)
    const contentInput = screen.getByLabelText(/Page Content/)

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated Title')

    await user.clear(contentInput)
    await user.type(contentInput, '# Updated Title\n\nUpdated content with new section.')

    // Submit form
    await user.click(screen.getByText('Save Changes'))

    // Should call API with updated data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wiki/test-wiki/pages/test-page.md',
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Updated Title')
        })
      )
    })

    await waitFor(() => {
      expect(mockOnPageUpdated).toHaveBeenCalledWith({
        id: 'file-1',
        filename: 'test-page.md',
        versionId: 'version-2'
      })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully without closing modal', async () => {
    const user = userEvent.setup()

    // Mock initial content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Page\n\nContent'
      })
    })

    // Mock API error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update page' })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument()
    })

    // Update content and try to save
    const contentInput = screen.getByLabelText(/Page Content/)
    await user.clear(contentInput)
    await user.type(contentInput, 'Updated content')

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText('Failed to update page')).toBeInTheDocument()
    })

    // Modal should still be open
    expect(screen.getByText('Edit Page')).toBeInTheDocument()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup()

    // Mock page content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Page\n\nContent'
      })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows loading state while saving', async () => {
    const user = userEvent.setup()

    // Mock page content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Page\n\nContent'
      })
    })

    // Mock slow API response
    ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { id: 'file-1' } })
      }), 100))
    )

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    // Wait for content to load first
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument()
    })

    // Try to save
    await user.click(screen.getByText('Save Changes'))

    // Should show loading state
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByText('Saving...')).toBeDisabled()
  })

  it('handles content loading errors', async () => {
    // Mock failed content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to load page content' })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    // Wait for error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load page content')).toBeInTheDocument()
    })

    // Should still show the form with empty content
    expect(screen.getByText('Edit Page')).toBeInTheDocument()
    expect(screen.getByLabelText(/Page Title/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Page Content/)).toBeInTheDocument()
  })

  it('displays correct filename in readonly format', async () => {
    // Mock page content fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        content: '# Test Page\n\nContent'
      })
    })

    render(
      <EditPageModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
        onPageUpdated={mockOnPageUpdated}
      />
    )

    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument()
    })

    // Filename should be displayed as readonly
    const filenameElement = screen.getByDisplayValue('test-page.md')
    expect(filenameElement).toHaveAttribute('readonly')
    expect(filenameElement).toHaveClass('cursor-not-allowed')
  })
})