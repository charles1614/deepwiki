import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddPageModal } from '@/components/AddPageModal'
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

const mockOnClose = jest.fn()
const mockOnPageCreated = jest.fn()

describe('AddPageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when open', () => {
    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    expect(screen.getByText('Add New Page')).toBeInTheDocument()
    expect(screen.getByLabelText(/Page Title/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Page Content/)).toBeInTheDocument()
    expect(screen.getByText('Create Page')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={false}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    expect(screen.queryByText('Add New Page')).not.toBeInTheDocument()
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()

    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    // Try to submit without filling required fields
    const createButton = screen.getByText('Create Page')
    await user.click(createButton)

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Page title is required')).toBeInTheDocument()
    })
  })

  it('generates filename from title', async () => {
    const user = userEvent.setup()

    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    const titleInput = screen.getByLabelText('Page Title')
    await user.type(titleInput, 'My New Page')

    // Should show generated filename
    expect(screen.getByDisplayValue('my-new-page.md')).toBeInTheDocument()
  })

  it('creates page successfully', async () => {
    const user = userEvent.setup()

    // Mock successful API response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'new-file-id',
          filename: 'my-new-page.md'
        }
      })
    })

    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    // Fill form
    const titleInput = screen.getByLabelText(/Page Title/)
    const contentInput = screen.getByLabelText(/Page Content/)

    await user.type(titleInput, 'My New Page')
    await user.type(contentInput, '# My New Page\n\nThis is a new page.')

    // Submit form
    const createButton = screen.getByText('Create Page')
    await user.click(createButton)

    // Should call API
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/wiki/test-wiki/pages',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('My New Page')
      })
    )

    await waitFor(() => {
      expect(mockOnPageCreated).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles API errors gracefully', async () => {
    const user = userEvent.setup()

    // Mock API error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create page' })
    })

    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    // Fill form
    const titleInput = screen.getByLabelText(/Page Title/)
    const contentInput = screen.getByLabelText(/Page Content/)

    await user.type(titleInput, 'My New Page')
    await user.type(contentInput, '# My New Page\n\nThis is a new page.')

    // Submit form
    const createButton = screen.getByText('Create Page')
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to create page')).toBeInTheDocument()
    })

    // Should not close modal on error
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('generates unique filename when file already exists', async () => {
    const user = userEvent.setup()

    // Mock API response indicating file exists
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'File already exists' })
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'new-file-id',
          filename: 'my-new-page-1.md'
        }
      })
    })

    render(
      <AddPageModal
        wiki={mockWiki}
        isOpen={true}
        onClose={mockOnClose}
        onPageCreated={mockOnPageCreated}
      />
    )

    // Fill form with title that would conflict
    const titleInput = screen.getByLabelText(/Page Title/)
    const contentInput = screen.getByLabelText(/Page Content/)

    await user.type(titleInput, 'My New Page')
    await user.type(contentInput, '# My New Page\n\nThis is a new page.')

    // Submit form
    const createButton = screen.getByText('Create Page')
    await user.click(createButton)

    await waitFor(() => {
      expect(mockOnPageCreated).toHaveBeenCalled()
    })
  })
})