import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikiViewer } from '@/components/WikiViewer'
import { getServerSession } from 'next-auth'

// Mock NextAuth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

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

describe('Wiki Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      },
    })

    // Mock successful file content fetch
    ;(global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/file/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, content: '# Test Content' })
        })
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      })
    })
  })

  describe('Complete Page Management Workflow', () => {
    it('should allow users to switch from reading to managing and back', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Initially in read mode
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByText('Exit Manage')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
      expect(screen.queryByText('+ Add Page')).not.toBeInTheDocument()

      // Switch to manage mode
      await user.click(screen.getByText('Manage'))

      // Check manage mode is active
      expect(screen.getByText('Exit Manage')).toBeInTheDocument()
      expect(screen.queryByText('Manage')).not.toBeInTheDocument()
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockFiles.length)
      expect(screen.getByText('+ Add Page')).toBeInTheDocument()

      // Should show selection count
      expect(screen.getByText('(0 selected)')).toBeInTheDocument()

      // Select a file
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      expect(screen.getByText('(1 selected)')).toBeInTheDocument()

      // Switch back to read mode
      await user.click(screen.getByText('Exit Manage'))

      // Should be back in read mode
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByText('Exit Manage')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
      expect(screen.queryByText('+ Add Page')).not.toBeInTheDocument()
    })

    it('should open Add Page modal when Add Page button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode
      await user.click(screen.getByText('Manage'))

      // Click Add Page button
      await user.click(screen.getByText('+ Add Page'))

      // Should see modal
      expect(screen.getByText('Add New Page')).toBeInTheDocument()
      expect(screen.getByLabelText(/Page Title/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Page Content/)).toBeInTheDocument()
      expect(screen.getByText('Create Page')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('should create a new page and refresh', async () => {
      const user = userEvent.setup()

      // Mock successful page creation
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 'new-file-id',
            filename: 'test-page.md'
          }
        })
      })

      // Mock location reload
      const mockReload = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: mockReload },
        writable: true,
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open Add Page modal
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByText('+ Add Page'))

      // Fill out the form
      const titleInput = screen.getByLabelText(/Page Title/)
      const contentInput = screen.getByLabelText(/Page Content/)

      await user.type(titleInput, 'Test Page')
      await user.type(contentInput, '# Test Page\n\nThis is a test page.')

      // Submit the form
      await user.click(screen.getByText('Create Page'))

      // Should create the page and reload
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/wiki/test-wiki/pages',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Test Page')
          })
        )
      })

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled()
      })
    })

    it('should handle page creation errors without closing modal', async () => {
      const user = userEvent.setup()

      // Mock API error
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create page' })
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open Add Page modal
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByText('+ Add Page'))

      // Fill out the form
      const titleInput = screen.getByLabelText(/Page Title/)
      const contentInput = screen.getByLabelText(/Page Content/)

      await user.type(titleInput, 'Test Page')
      await user.type(contentInput, '# Test Page\n\nThis is a test page.')

      // Submit the form
      await user.click(screen.getByText('Create Page'))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to create page')).toBeInTheDocument()
      })

      // Modal should still be open
      expect(screen.getByText('Add New Page')).toBeInTheDocument()
    })

    it('should close modal when Cancel is clicked', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open Add Page modal
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByText('+ Add Page'))

      // Click Cancel
      await user.click(screen.getByText('Cancel'))

      // Modal should close
      expect(screen.queryByText('Add New Page')).not.toBeInTheDocument()
      expect(screen.getByText('Exit Manage')).toBeInTheDocument()
      expect(screen.getByText('+ Add Page')).toBeInTheDocument()
    })
  })

  describe('User Experience', () => {
    it('should provide smooth transitions between modes', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Should start in clean reading mode
      expect(screen.queryByText('Exit Manage')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)

      // Switch to manage mode
      await user.click(screen.getByText('Manage'))

      // Should transition smoothly to manage mode
      expect(screen.getByText('Exit Manage')).toBeInTheDocument()
      expect(screen.getAllByRole('checkbox')).toHaveLength(mockFiles.length)

      // Back to read mode
      await user.click(screen.getByText('Exit Manage'))

      // Should return to clean reading mode
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    })

    it('should maintain file selection state during mode changes', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and select files
      await user.click(screen.getByText('Manage'))

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      expect(screen.getByText('(2 selected)')).toBeInTheDocument()

      // Toggle back to read mode
      await user.click(screen.getByText('Exit Manage'))
      await user.click(screen.getByText('Manage'))

      // Selection should be cleared
      checkboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
      expect(screen.getByText('(0 selected)')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully without breaking the UI', async () => {
      const user = userEvent.setup()

      // Mock fetch errors for file content
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Should still render the interface even with errors
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.getByText('Test Wiki')).toBeInTheDocument()
    })
  })
})