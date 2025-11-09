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

describe('Wiki Edit Integration Tests', () => {
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

  describe('Edit Page Workflow', () => {
    it('should allow users to edit a page in manage mode', async () => {
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

      // Should see edit buttons for each file
      expect(screen.getByTestId('edit-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('edit-file-2')).toBeInTheDocument()

      // Click edit button for first file
      await user.click(screen.getByTestId('edit-file-1'))

      // Should open edit modal
      expect(screen.getByText('Edit Page')).toBeInTheDocument()
    })

    it('should load existing page content in edit modal', async () => {
      const user = userEvent.setup()

      // Mock specific page content
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }
        if (url.includes('/pages/index.md')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              content: '# Index Page\n\nThis is the main page content.'
            })
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and edit first file
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('edit-file-1'))

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Index Page')).toBeInTheDocument()
      })

      // Check textarea content
      const contentTextarea = screen.getByLabelText(/Page Content/)
      expect(contentTextarea).toHaveValue('# Index Page\n\nThis is the main page content.')
      expect(screen.getByDisplayValue('index.md')).toBeInTheDocument()
    })

    it('should update page content and refresh', async () => {
      const user = userEvent.setup()

      let fetchCallCount = 0

      // Mock page content fetch
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        fetchCallCount++

        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }

        if (url.includes('/pages/index.md') && fetchCallCount <= 2) {
          // First calls are for GET requests
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              content: '# Index Page\n\nOriginal content.'
            })
          })
        }

        if (url.includes('/pages/index.md')) {
          // PUT request for updating
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                id: 'file-1',
                filename: 'index.md',
                versionId: 'version-2'
              }
            })
          })
        }

        return Promise.resolve({ ok: false, status: 404 })
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and edit first file
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('edit-file-1'))

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Index Page')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Update title and content
      const titleInput = screen.getByLabelText(/Page Title/)
      const contentInput = screen.getByLabelText(/Page Content/)

      await user.clear(titleInput)
      await user.type(titleInput, 'Updated Index Page')

      await user.clear(contentInput)
      await user.type(contentInput, '# Updated Index Page\n\nThis content has been updated.')

      // Save changes
      await user.click(screen.getByText('Save Changes'))

      // Should call API with updated data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/wiki/test-wiki/pages/index.md',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Updated Index Page')
          })
        )
      }, { timeout: 3000 })

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByText('Edit Page')).not.toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should handle edit errors without closing modal', async () => {
      const user = userEvent.setup()

      let fetchCallCount = 0

      // Mock page content fetch
      ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
        fetchCallCount++

        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }

        if (url.includes('/pages/index.md') && fetchCallCount <= 2) {
          // First calls are for GET requests
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              content: '# Index Page\n\nOriginal content.'
            })
          })
        }

        if (url.includes('/pages/index.md') && options?.method === 'PUT') {
          // PUT request that fails
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Failed to update page' })
          })
        }

        return Promise.resolve({ ok: false, status: 404 })
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and edit first file
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('edit-file-1'))

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Index Page')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Update content and try to save
      const contentInput = screen.getByLabelText(/Page Content/)
      await user.clear(contentInput)
      await user.type(contentInput, 'Updated content')

      await user.click(screen.getByText('Save Changes'))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to update page')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Modal should still be open
      expect(screen.getByText('Edit Page')).toBeInTheDocument()
    })

    it('should close edit modal when Cancel is clicked', async () => {
      const user = userEvent.setup()

      // Mock page content fetch
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }
        if (url.includes('/pages/index.md')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              content: '# Index Page\n\nOriginal content.'
            })
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and edit first file
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('edit-file-1'))

      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText('Edit Page')).toBeInTheDocument()
      })

      // Click Cancel
      await user.click(screen.getByText('Cancel'))

      // Modal should close
      expect(screen.queryByText('Edit Page')).not.toBeInTheDocument()
      expect(screen.getByText('Exit Manage')).toBeInTheDocument()
    })

    it('should not show edit buttons in read mode', async () => {
      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Should be in read mode initially
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByText('Exit Manage')).not.toBeInTheDocument()

      // Should not see edit buttons
      expect(screen.queryByTestId('edit-file-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('edit-file-2')).not.toBeInTheDocument()
    })
  })

  describe('User Experience', () => {
    it('should provide smooth transitions between manage and edit modes', async () => {
      const user = userEvent.setup()

      // Mock page content fetch
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }
        if (url.includes('/pages/index.md')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              content: '# Index Page\n\nOriginal content.'
            })
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Start in read mode
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByTestId('edit-file-1')).not.toBeInTheDocument()

      // Switch to manage mode
      await user.click(screen.getByText('Manage'))
      expect(screen.getByTestId('edit-file-1')).toBeInTheDocument()

      // Open edit modal
      await user.click(screen.getByTestId('edit-file-1'))
      await waitFor(() => {
        expect(screen.getByText('Edit Page')).toBeInTheDocument()
      })

      // Close edit modal
      await user.click(screen.getByText('Cancel'))
      expect(screen.queryByText('Edit Page')).not.toBeInTheDocument()
      expect(screen.getByTestId('edit-file-1')).toBeInTheDocument()

      // Return to read mode
      await user.click(screen.getByText('Exit Manage'))
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByTestId('edit-file-1')).not.toBeInTheDocument()
    })
  })
})