import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VersionHistoryModal } from '@/components/VersionHistoryModal'
import { WikiFile } from '@/components/WikiViewer'

// Mock fetch for API calls
global.fetch = jest.fn()

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

const mockFile: WikiFile = {
  id: 'file-1',
  filename: 'test-page.md',
  originalName: 'test-page.md',
  size: 1024,
  url: 'https://example.com/file1',
  uploadedAt: '2024-01-01T00:00:00Z',
}

const mockVersions = [
  {
    id: 'version-1',
    versionNumber: 3,
    changeType: 'UPDATE',
    changeDescription: 'Updated content section',
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

const mockOnClose = jest.fn()

describe('VersionHistoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal when open', () => {
    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Version History')).toBeInTheDocument()
    expect(screen.getByText(/test-page\.md/)).toBeInTheDocument()
    expect(screen.getByText(/1\s*KB/)).toBeInTheDocument()
    expect(screen.getByText('Close')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={false}
        onClose={mockOnClose}
      />
    )

    expect(screen.queryByText('Version History')).not.toBeInTheDocument()
  })

  it('fetches and displays version history', async () => {
    const user = userEvent.setup()

    // Mock successful version fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          versions: mockVersions
        }
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Should show loading initially
    expect(screen.getByText('Version History')).toBeInTheDocument()

    // Wait for versions to load
    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
      expect(screen.getByText('Version 2')).toBeInTheDocument()
      expect(screen.getByText('Version 1')).toBeInTheDocument()
    })

    // Should display version details
    expect(screen.getByText('Updated content section')).toBeInTheDocument()
    expect(screen.getByText('Fixed typos')).toBeInTheDocument()
    expect(screen.getByText('Initial page creation')).toBeInTheDocument()
    expect(screen.getAllByText('By John Doe')).toHaveLength(3)
    expect(screen.getByText(/2\s*KB/)).toBeInTheDocument()
    expect(screen.getByText(/1\.5\s*KB/)).toBeInTheDocument()
  })

  it('displays correct change type colors', async () => {
    // Mock successful version fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          versions: mockVersions
        }
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Wait for versions to load first
    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    // Then check for change types
    expect(screen.getAllByText('UPDATE')).toHaveLength(2)
    expect(screen.getByText('CREATE')).toBeInTheDocument()
  })

  it('shows rollback button for versions > 1', async () => {
    // Mock successful version fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          versions: mockVersions
        }
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    await waitFor(() => {
      // Version 3 and 2 should have rollback buttons
      expect(screen.getAllByText('Rollback')).toHaveLength(2)
    })
  })

  it('does not show rollback button for version 1', async () => {
    const versions = [mockVersions[2]] // Only version 1

    // Mock successful version fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          versions: versions
        }
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    await waitFor(() => {
      expect(screen.queryByText('Rollback')).not.toBeInTheDocument()
    })
  })

  it('handles rollback successfully', async () => {
    const user = userEvent.setup()
    const mockConfirm = window.confirm as jest.Mock

    // Mock successful version fetch and rollback
    ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              versions: mockVersions
            }
          })
        })
      }
      if (url.includes('/versions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              versions: mockVersions
            }
          })
        })
      }
      return Promise.resolve({
        ok: false,
        status: 404
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    // Click rollback button for version 3 (first rollback button)
    const rollbackButtons = screen.getAllByText('Rollback')
    await user.click(rollbackButtons[0])

    // Should call confirm with correct message
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to rollback to version 3? This will create a new version with the content from that version.'
    )

    // Should call API with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/wiki/test-wiki/pages/test-page.md/versions',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            versionId: 'version-1'  // First rollback button is version 3, which has id 'version-1'
          })
        })
      )
    })
  })

  it('cancels rollback when confirmation is cancelled', async () => {
    const user = userEvent.setup()
    const mockConfirm = window.confirm as jest.Mock

    // Mock successful version fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          versions: mockVersions
        }
      })
    })

    // Mock confirm to return false
    mockConfirm.mockReturnValue(false)

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    // Click rollback button
    const rollbackButtons = screen.getAllByText('Rollback')
    await user.click(rollbackButtons[0])

    // Should call confirm but not call API since confirmation was cancelled
    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to rollback to version 3? This will create a new version with the content from that version.'
    )

    // Should not call rollback API
    expect(global.fetch).not.toHaveBeenCalledWith(
      '/api/wiki/test-wiki/pages/test-page.md/versions',
      expect.objectContaining({
        method: 'POST'
      })
    )
  })

  it('handles rollback errors gracefully', async () => {
    const user = userEvent.setup()

    // Mock successful version fetch
    ;(global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Failed to rollback version' })
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            versions: mockVersions
          }
        })
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

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

  it('shows loading state during rollback', async () => {
    const user = userEvent.setup()

    // Mock slow version fetch
    ;(global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: { versions: mockVersions }
        })
      }), 100))
    )

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click rollback button
    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    const rollbackButtons = screen.getAllByText('Rollback')
    await user.click(rollbackButtons[0])

    // Mock window.confirm to return true
    window.confirm = jest.fn(() => true)

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Rolling back...')).toBeInTheDocument()
    })
  })

  it('handles version fetch errors gracefully', async () => {
    // Mock failed version fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch version history')).toBeInTheDocument()
    })

    // Modal should still be open
    expect(screen.getByText('Version History')).toBeInTheDocument()
  })

  it('shows empty state when no versions exist', async () => {
    // Mock successful version fetch with no versions
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { versions: [] }
      })
    })

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText('No version history available')).toBeInTheDocument()
    })
  })

  it('closes modal when Close is clicked', async () => {
    const user = userEvent.setup()

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click Close
    await user.click(screen.getByText('Close'))

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('closes modal when X is clicked', async () => {
    const user = userEvent.setup()

    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    // Click X button
    const closeButton = screen.getByRole('button', { name: '' }) // X button has no text
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('displays file metadata correctly', () => {
    render(
      <VersionHistoryModal
        wiki={mockWiki}
        file={mockFile}
        isOpen={true}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText(/test-page\.md/)).toBeInTheDocument()
    expect(screen.getByText(/1\s*KB/)).toBeInTheDocument()
  })
})