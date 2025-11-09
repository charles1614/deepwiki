import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeletePageModal } from '@/components/DeletePageModal'
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
const mockOnPageDeleted = jest.fn()

describe('DeletePageModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when open', () => {
    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    expect(screen.getByText('Delete Page')).toBeInTheDocument()
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
    expect(screen.getByText('test-page.md')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={false}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    expect(screen.queryByText('Delete Pages')).not.toBeInTheDocument()
  })

  it('displays multiple files correctly', () => {
    const mockFiles = [
      mockFile,
      {
        id: 'file-2',
        filename: 'about.md',
        originalName: 'about.md',
        size: 2048,
        url: 'https://example.com/file2',
        uploadedAt: '2024-01-01T00:00:00Z',
      }
    ]

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={mockFiles}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    expect(screen.getByText('Delete 2 Pages')).toBeInTheDocument()
    expect(screen.getByText('test-page.md')).toBeInTheDocument()
    expect(screen.getByText('about.md')).toBeInTheDocument()
    expect(screen.getByText(/This action will permanently delete 2 pages/)).toBeInTheDocument()
  })

  it('shows singular form for single file', () => {
    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    expect(screen.getByText('Delete Page')).toBeInTheDocument()
    expect(screen.getByText(/This action will permanently delete 1 page/)).toBeInTheDocument()
  })

  it('deletes pages successfully', async () => {
    const user = userEvent.setup()

    // Mock successful deletion
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          deletedFiles: [{ id: 'file-1', filename: 'test-page.md' }]
        }
      })
    })

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    // Click delete button
    await user.click(screen.getByText('Delete'))

    // Should call API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wiki/test-wiki/pages',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({
            fileIds: ['file-1']
          })
        })
      )
    })

    // Should call callbacks
    await waitFor(() => {
      expect(mockOnPageDeleted).toHaveBeenCalledWith(['file-1'])
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles delete errors gracefully', async () => {
    const user = userEvent.setup()

    // Mock API error
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to delete pages' })
    })

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    // Click delete button
    await user.click(screen.getByText('Delete'))

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to delete pages')).toBeInTheDocument()
    })

    // Modal should still be open
    expect(screen.getByText('Delete Page')).toBeInTheDocument()
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('closes modal when Cancel is clicked', async () => {
    const user = userEvent.setup()

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    // Click Cancel
    await user.click(screen.getByText('Cancel'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows loading state while deleting', async () => {
    const user = userEvent.setup()

    // Mock slow API response
    ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { deletedFiles: [] } })
      }), 100))
    )

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    // Click delete button
    await user.click(screen.getByText('Delete'))

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
    expect(screen.getByText('Deleting...')).toBeDisabled()
  })

  it('disables buttons during loading', async () => {
    const user = userEvent.setup()

    // Mock slow API response
    ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ success: true, data: { deletedFiles: [] } })
      }), 100))
    )

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[mockFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    // Click delete button
    await user.click(screen.getByText('Delete'))

    // Wait for loading state and check buttons
    await waitFor(() => {
      expect(screen.getByText('Deleting...')).toBeInTheDocument()
    })
    expect(screen.getByText('Deleting...')).toBeDisabled()
    expect(screen.getByText('Cancel')).toBeDisabled()
  })

  it('cannot delete when no files provided', () => {
    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    expect(screen.getByText('No pages selected')).toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('prevents deletion of index.md file', () => {
    const indexFile = {
      ...mockFile,
      filename: 'index.md'
    }

    render(
      <DeletePageModal
        wiki={mockWiki}
        files={[indexFile]}
        isOpen={true}
        onClose={mockOnClose}
        onPageDeleted={mockOnPageDeleted}
      />
    )

    expect(screen.getByText(/Cannot delete index\.md/)).toBeInTheDocument()
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})