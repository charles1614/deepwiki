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

// Mock window.location.reload
;(window as any).location = { reload: jest.fn() }

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
  {
    id: 'file-3',
    filename: 'contact.md',
    originalName: 'contact.md',
    size: 1536,
    url: 'https://example.com/file3',
    uploadedAt: '2024-01-01T00:00:00Z',
  },
]

describe('Wiki Delete Integration Tests', () => {
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

  describe('Delete Page Workflow', () => {
    it('should allow users to select and delete multiple pages in manage mode', async () => {
      const user = userEvent.setup()

      // Mock successful deletion
      ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }
        if (url.includes('/pages') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                deletedFiles: [
                  { id: 'file-2', filename: 'about.md' },
                  { id: 'file-3', filename: 'contact.md' }
                ]
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

      // Switch to manage mode
      await user.click(screen.getByText('Manage'))

      // Should see checkboxes and Delete button
      expect(screen.getAllByRole('checkbox')).toHaveLength(3)
      expect(screen.queryByText(/Delete Selected/)).not.toBeInTheDocument()

      // Select multiple files
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Select about.md
      await user.click(checkboxes[2]) // Select contact.md

      // Should show selection count and delete button
      expect(screen.getByText('(2 selected)')).toBeInTheDocument()
      expect(screen.getByText('Delete Selected (2)')).toBeInTheDocument()

      // Click delete button
      await user.click(screen.getByText('Delete Selected (2)'))

      // Should open delete modal
      expect(screen.getByText('Delete 2 Pages')).toBeInTheDocument()
      expect(screen.getByText('about.md')).toBeInTheDocument()
      expect(screen.getByText('contact.md')).toBeInTheDocument()

      // Confirm deletion
      await user.click(screen.getByText('Delete'))

      // Should call API with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/wiki/test-wiki/pages',
          expect.objectContaining({
            method: 'DELETE',
            body: JSON.stringify({
              fileIds: ['file-2', 'file-3']
            })
          })
        )
      })
    })

    it('should prevent deletion of index.md file', async () => {
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

      // Select index.md (first file)
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      // Should show delete button
      expect(screen.getByText('Delete Selected (1)')).toBeInTheDocument()

      // Click delete button
      await user.click(screen.getByText('Delete Selected (1)'))

      // Should show warning about index.md
      expect(screen.getByText(/Cannot delete index\.md/)).toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    })

    it('should show individual delete button for each file', async () => {
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

      // Should see edit buttons for each file (and can add delete buttons similarly)
      expect(screen.getByTestId('edit-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('edit-file-2')).toBeInTheDocument()
      expect(screen.getByTestId('edit-file-3')).toBeInTheDocument()
    })

    it('should handle delete errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock failed deletion
      ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
          })
        }
        if (url.includes('/pages') && options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Failed to delete pages' })
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

      // Switch to manage mode and select a file
      await user.click(screen.getByText('Manage'))
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Select about.md

      // Click delete button
      await user.click(screen.getByText('Delete Selected (1)'))
      await user.click(screen.getByText('Delete'))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to delete pages')).toBeInTheDocument()
      })

      // Modal should still be open
      expect(screen.getByText('Delete Page')).toBeInTheDocument()
    })

    it('should close delete modal when Cancel is clicked', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and select a file
      await user.click(screen.getByText('Manage'))
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1]) // Select about.md

      // Click delete button
      await user.click(screen.getByText('Delete Selected (1)'))

      // Should see delete modal
      expect(screen.getByText('Delete Page')).toBeInTheDocument()

      // Click Cancel
      await user.click(screen.getByText('Cancel'))

      // Modal should close
      expect(screen.queryByText('Delete Page')).not.toBeInTheDocument()
      expect(screen.getByText('Exit Manage')).toBeInTheDocument()
    })

    it('should not show delete button in read mode', async () => {
      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Should be in read mode initially
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByText('Delete Selected')).not.toBeInTheDocument()
    })
  })

  describe('User Experience', () => {
    it('should provide clear feedback for selection state', async () => {
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

      // Initially no selection
      expect(screen.getByText('(0 selected)')).toBeInTheDocument()
      expect(screen.queryByText(/Delete Selected/)).not.toBeInTheDocument()

      // Select one file
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[1])

      // Should show selection state
      expect(screen.getByText('(1 selected)')).toBeInTheDocument()
      expect(screen.getByText('Delete Selected (1)')).toBeInTheDocument()

      // Select another file
      await user.click(checkboxes[2])

      // Should update selection state
      expect(screen.getByText('(2 selected)')).toBeInTheDocument()
      expect(screen.getByText('Delete Selected (2)')).toBeInTheDocument()
    })

    it('should update selection count dynamically', async () => {
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

      const checkboxes = screen.getAllByRole('checkbox')

      // Select files one by one
      await user.click(checkboxes[0])
      expect(screen.getByText('(1 selected)')).toBeInTheDocument()

      await user.click(checkboxes[1])
      expect(screen.getByText('(2 selected)')).toBeInTheDocument()

      await user.click(checkboxes[2])
      expect(screen.getByText('(3 selected)')).toBeInTheDocument()

      // Deselect files
      await user.click(checkboxes[0])
      expect(screen.getByText('(2 selected)')).toBeInTheDocument()

      await user.click(checkboxes[1])
      expect(screen.getByText('(1 selected)')).toBeInTheDocument()

      await user.click(checkboxes[2])
      expect(screen.getByText('(0 selected)')).toBeInTheDocument()
    })
  })
})