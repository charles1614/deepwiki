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

// Mock window.confirm
window.confirm = jest.fn(() => true)

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

const mockVersions = [
  {
    id: 'version-1',
    versionNumber: 3,
    changeType: 'UPDATE',
    changeDescription: 'Updated about section',
    contentSize: 2048,
    checksum: 'abc123',
    createdAt: '2024-01-03T00:00:00Z',
    author: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com'
    }
  },
  {
    id: 'version-2',
    versionNumber: 2,
    changeType: 'UPDATE',
    changeDescription: 'Fixed typos',
    contentSize: 1536,
    checksum: 'def456',
    createdAt: '2024-01-02T00:00:00Z',
    author: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com'
    }
  },
  {
    id: 'version-3',
    versionNumber: 1,
    changeType: 'CREATE',
    changeDescription: 'Initial page creation',
    contentSize: 1024,
    checksum: 'ghi789',
    createdAt: '2024-01-01T00:00:00Z',
    author: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com'
    }
  }
]

describe('Wiki Version History Integration Tests', () => {
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
      if (url.includes('/versions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: { versions: mockVersions }
          })
        })
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      })
    })
  })

  describe('Version History Access', () => {
    it('should show version history button in manage mode', async () => {
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

      // Should see edit and history buttons for files (not index.md)
      expect(screen.getByTestId('edit-file-2')).toBeInTheDocument()
      expect(screen.getByTestId('history-file-2')).toBeInTheDocument()

      // Index.md should have edit button but history button might not be necessary for main page
      expect(screen.getByTestId('edit-file-1')).toBeInTheDocument()
      expect(screen.getByTestId('history-file-1')).toBeInTheDocument()
    })

    it('should not show version history button in read mode', () => {
      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Should be in read mode initially
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.queryByTestId('history-file-1')).not.toBeInTheDocument()
      expect(screen.queryByTestId('history-file-2')).not.toBeInTheDocument()
    })

    it('should open version history modal when history button is clicked', async () => {
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

      // Click history button for about.md
      await user.click(screen.getByTestId('history-file-2'))

      // Should open version history modal
      expect(screen.getByText('Version History')).toBeInTheDocument()
      expect(screen.getByText(/about\.md/)).toBeInTheDocument()
      expect(screen.getAllByText(/2\s*KB/)).toHaveLength(2)
    })
  })

  describe('Version History Display', () => {
    it('should display all versions with correct information', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for versions to load
      await waitFor(() => {
        expect(screen.getByText('Version 3')).toBeInTheDocument()
        expect(screen.getByText('Version 2')).toBeInTheDocument()
        expect(screen.getByText('Version 1')).toBeInTheDocument()
      })

      // Should display version details
      expect(screen.getByText('Updated about section')).toBeInTheDocument()
      expect(screen.getByText('Fixed typos')).toBeInTheDocument()
      expect(screen.getByText('Initial page creation')).toBeInTheDocument()
      expect(screen.getAllByText('By John Doe')).toHaveLength(3)
      expect(screen.getAllByText(/2\s*KB/)).toHaveLength(2) // Header + version 3
      expect(screen.getByText(/1\.5\s*KB/)).toBeInTheDocument()
      expect(screen.getByText(/1\s*KB/)).toBeInTheDocument()
    })

    it('should display change type badges', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for versions to load
      await waitFor(() => {
        expect(screen.getAllByText('UPDATE')).toHaveLength(2)
        expect(screen.getByText('CREATE')).toBeInTheDocument()
      })
    })

    it('should show rollback buttons for eligible versions', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for versions to load
      await waitFor(() => {
        // Should have rollback buttons for versions 2 and 3
        expect(screen.getAllByText('Rollback')).toHaveLength(2)
      })
    })
  })

  describe('Version Rollback', () => {
    it('should successfully rollback to a previous version', async () => {
      const user = userEvent.setup()

      // Mock successful rollback
      ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (options?.method === 'POST' && url.includes('/versions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                versionId: 'new-version-id',
                versionNumber: 4,
                content: '# Rolled back content',
                changeDescription: 'Rollback to version 2',
                createdAt: new Date().toISOString()
              }
            })
          })
        }
        if (url.includes('/versions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { versions: mockVersions }
            })
          })
        }
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
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

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for versions to load
      await waitFor(() => {
        expect(screen.getByText('Version 3')).toBeInTheDocument()
      })

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true)

      // Click rollback button for version 2
      const rollbackButtons = screen.getAllByText('Rollback')
      await user.click(rollbackButtons[0])

      // Should show confirmation dialog
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to rollback to version 3')
      )

      // Should call API with correct data
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/wiki/test-wiki/pages/about.md/versions',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              versionId: 'version-1'  // First rollback button is version 3, which has id 'version-1'
            })
          })
        )
      })
    })

    it('should not rollback when confirmation is cancelled', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for versions to load
      await waitFor(() => {
        expect(screen.getByText('Version 3')).toBeInTheDocument()
      })

      // Mock window.confirm to return false
      window.confirm = jest.fn(() => false)

      // Click rollback button
      const rollbackButtons = screen.getAllByText('Rollback')
      await user.click(rollbackButtons[0])

      // Should not call rollback API
      expect(global.fetch).not.toHaveBeenCalledWith(
        '/api/wiki/test-wiki/pages/about.md/versions',
        expect.objectContaining({
          method: 'POST'
        })
      )
    })

    it('should handle rollback errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock failed rollback
      ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (options?.method === 'POST' && url.includes('/versions')) {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: 'Failed to rollback version' })
          })
        }
        if (url.includes('/versions')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { versions: mockVersions }
            })
          })
        }
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
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

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for versions to load
      await waitFor(() => {
        expect(screen.getByText('Version 3')).toBeInTheDocument()
      })

      // Mock window.confirm to return true
      window.confirm = jest.fn(() => true)

      // Click rollback button
      const rollbackButtons = screen.getAllByText('Rollback')
      await user.click(rollbackButtons[0])

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to rollback version')).toBeInTheDocument()
      })

      // Modal should still be open
      expect(screen.getByText('Version History')).toBeInTheDocument()
    })
  })

  describe('Modal Behavior', () => {
    it('should close modal when Close is clicked', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Version History')).toBeInTheDocument()
      })

      // Click Close
      await user.click(screen.getByText('Close'))

      // Modal should close
      expect(screen.queryByText('Version History')).not.toBeInTheDocument()
      expect(screen.getByText('Exit Manage')).toBeInTheDocument()
    })

    it('should close modal when X is clicked', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Version History')).toBeInTheDocument()
      })

      // Click X button (top right close button)
      const closeButton = screen.getByRole('button', { name: '' })
      await user.click(closeButton)

      // Modal should close
      expect(screen.queryByText('Version History')).not.toBeInTheDocument()
    })

    it('should handle version fetch errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock failed version fetch
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url.includes('/versions')) {
          return Promise.resolve({
            ok: false,
            status: 500
          })
        }
        if (url.includes('/file/')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, content: '# Test Content' })
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

      // Switch to manage mode and open version history
      await user.click(screen.getByText('Manage'))
      await user.click(screen.getByTestId('history-file-2'))

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Failed to fetch version history')).toBeInTheDocument()
      })

      // Modal should still be open
      expect(screen.getByText('Version History')).toBeInTheDocument()
    })
  })

  describe('Multiple Files', () => {
    it('should show version history for different files independently', async () => {
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

      // Open version history for about.md
      await user.click(screen.getByTestId('history-file-2'))

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText(/about\.md/)).toBeInTheDocument()
      })

      // Close modal
      await user.click(screen.getByText('Close'))

      // Open version history for index.md
      await user.click(screen.getByTestId('history-file-1'))

      // Wait for modal to open with different file
      await waitFor(() => {
        expect(screen.getByText(/index\.md/)).toBeInTheDocument()
      })
    })
  })
})