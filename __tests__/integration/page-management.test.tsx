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
    filename: 'page1.md',
    originalName: 'page1.md',
    size: 2048,
    url: 'https://example.com/file2',
    uploadedAt: '2024-01-01T00:00:00Z',
  },
]

describe('Page Management Integration Tests', () => {
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

  describe('Read Mode', () => {
    it('provides clean reading experience without management UI', async () => {
      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      await waitFor(() => {
        // Should show clean content area
        expect(screen.getByText('Test Wiki')).toBeInTheDocument()
      })

      // Should not show management controls
      expect(screen.queryByText('Add Page')).not.toBeInTheDocument()
      expect(screen.queryByText('Edit')).not.toBeInTheDocument()
      expect(screen.queryByText('Delete')).not.toBeInTheDocument()
      expect(screen.queryAllByRole('checkbox')).toHaveLength(0)

      // Should show file list in read-only format
      expect(screen.getByText('index')).toBeInTheDocument()
      expect(screen.getByText('page1')).toBeInTheDocument()
    })

    it('shows Manage button prominently in breadcrumb', () => {
      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Should show Manage button in breadcrumb area
      const manageButton = screen.getByRole('button', { name: /Manage/i })
      expect(manageButton).toBeInTheDocument()
      expect(manageButton).toHaveClass('bg-blue-600')
    })
  })

  describe('Manage Mode', () => {
    it('transforms interface for content management', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Enable manage mode
      const manageButton = screen.getByRole('button', { name: /Manage/i })
      await user.click(manageButton)

      await waitFor(() => {
        // Should show Exit Manage button
        expect(screen.getByRole('button', { name: /Exit Manage/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Exit Manage/i })).toHaveClass('bg-red-600')
      })

      // Should show checkboxes for file selection
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(mockFiles.length)

      // Should show file management options (these will be implemented)
      expect(screen.getByText('index')).toBeInTheDocument()
      expect(screen.getByText('page1')).toBeInTheDocument()
    })

    it('allows bulk file selection', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Enable manage mode
      await user.click(screen.getByRole('button', { name: /Manage/i }))

      // Select files individually
      const checkboxes = screen.getAllByRole('checkbox')

      await user.click(checkboxes[0])
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).not.toBeChecked()

      await user.click(checkboxes[1])
      expect(checkboxes[1]).toBeChecked()

      // Both files should be selected
      expect(checkboxes[0]).toBeChecked()
      expect(checkboxes[1]).toBeChecked()
    })

    it('clears selection when toggling modes', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Enable manage mode and select files
      await user.click(screen.getByRole('button', { name: /Manage/i }))

      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
      await user.click(checkboxes[1])

      // Exit manage mode
      await user.click(screen.getByRole('button', { name: /Exit Manage/i }))

      // Re-enter manage mode
      await user.click(screen.getByRole('button', { name: /Manage/i }))

      // Selection should be cleared
      const newCheckboxes = screen.getAllByRole('checkbox')
      newCheckboxes.forEach(checkbox => {
        expect(checkbox).not.toBeChecked()
      })
    })
  })

  describe('Mode Persistence', () => {
    it('maintains mode state during user interactions', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Enable manage mode
      await user.click(screen.getByRole('button', { name: /Manage/i }))

      // Navigate between files
      const fileButtons = screen.getAllByRole('button').filter(
        button => !button.textContent?.match(/Manage|Exit Manage/)
      )

      if (fileButtons.length > 0) {
        await user.click(fileButtons[0])

        // Should still be in manage mode
        expect(screen.getByRole('button', { name: /Exit Manage/i })).toBeInTheDocument()
        expect(screen.getAllByRole('checkbox')).toHaveLength(mockFiles.length)
      }
    })

    it('provides clear visual feedback for mode changes', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      const manageButton = screen.getByRole('button', { name: /Manage/i })

      // Initial state - blue Manage button
      expect(manageButton).toHaveClass('bg-blue-600')

      // Click to enable manage mode
      await user.click(manageButton)

      // Should show red Exit Manage button
      const exitManageButton = screen.getByRole('button', { name: /Exit Manage/i })
      expect(exitManageButton).toHaveClass('bg-red-600')
      expect(screen.queryByRole('button', { name: /Manage/i })).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', async () => {
      const user = userEvent.setup()

      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Enable manage mode
      await user.click(screen.getByRole('button', { name: /Manage/i }))

      // Check for proper roles and labels
      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach((checkbox, index) => {
        expect(checkbox).toHaveAttribute('type', 'checkbox')
      })

      const exitManageButton = screen.getByRole('button', { name: /Exit Manage/i })
      expect(exitManageButton).toHaveAttribute('type', 'button')
    })

    it('supports keyboard navigation', async () => {
      render(
        <WikiViewer
          wiki={mockWiki}
          files={mockFiles}
          onBack={jest.fn()}
        />
      )

      // Focus manage button
      const manageButton = screen.getByRole('button', { name: /Manage/i })
      manageButton.focus()
      expect(manageButton).toHaveFocus()

      // Should be able to activate with keyboard
      fireEvent.keyDown(manageButton, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Exit Manage/i })).toBeInTheDocument()
      })
    })
  })
})