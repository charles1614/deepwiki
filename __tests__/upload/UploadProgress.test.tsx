import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikiUpload } from '@/components/WikiUpload'

// Mock fetch for upload API
global.fetch = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}))

describe('WikiUpload Progress Tracking', () => {
  const mockOnUploadSuccess = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  describe('Progress Bar Display', () => {
    it('should show progress bar when upload starts', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 1000
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select files
      const fileInput = screen.getByTestId('file-input')
      const files = [
        new File(['# Test Content'], 'index.md', { type: 'text/markdown' }),
        new File(['# Another Page'], 'page.md', { type: 'text/markdown' })
      ]

      await userEvent.upload(fileInput, files)

      // Start upload
      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Progress bar should be visible immediately
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
      expect(screen.getByText('Uploading files...')).toBeInTheDocument()
    })

    it('should display progress percentage during upload', async () => {
      let progressCallback: ((progress: number) => void) | null = null

      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() => {
        return new Promise((resolve) => {
          // Simulate progress updates
          const simulateProgress = () => {
            if (progressCallback) {
              progressCallback(25)
              setTimeout(() => progressCallback!(50), 100)
              setTimeout(() => progressCallback!(75), 200)
              setTimeout(() => progressCallback!(100), 300)
              setTimeout(() => {
                resolve({
                  ok: true,
                  json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
                })
              }, 400)
            }
          }
          setTimeout(simulateProgress, 50)

          // Mock XMLHttpRequest for progress tracking
          return {
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }
        })
      })

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Should show initial progress
      expect(screen.getByText('25%')).toBeInTheDocument()

      // Should update progress
      await waitFor(() => {
        expect(screen.getByText('50%')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('75%')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('100%')).toBeInTheDocument()
      })
    })

    it('should show visual progress bar fill', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 500
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      const progressBar = screen.getByTestId('progress-bar-fill')

      // Should have initial width
      expect(progressBar).toHaveStyle({ width: '0%' })

      // Should update width during progress
      await waitFor(() => {
        expect(progressBar).toHaveStyle({ width: '50%' })
      })
    })
  })

  describe('Upload Status Messages', () => {
    it('should show uploading status with file count', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 500
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select multiple files
      const fileInput = screen.getByTestId('file-input')
      const files = [
        new File(['# Test'], 'index.md', { type: 'text/markdown' }),
        new File(['# Page 1'], 'page1.md', { type: 'text/markdown' }),
        new File(['# Page 2'], 'page2.md', { type: 'text/markdown' })
      ]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Should show count of files being uploaded
      expect(screen.getByText('Uploading 3 files...')).toBeInTheDocument()
    })

    it('should show processing message after upload completes', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 500
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // After upload completes, should show processing
      await waitFor(() => {
        expect(screen.getByText('Processing uploaded files...')).toBeInTheDocument()
      })
    })

    it('should show completion message', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
      })

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText('Upload completed successfully!')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling with Progress', () => {
    it('should show error message if upload fails during progress', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise((resolve, reject) =>
          setTimeout(() => reject(new Error('Network error')), 300)
        ))

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Should show progress initially
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument()

      // Should show error after failure
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument()
      })

      // Progress bar should be hidden after error
      expect(screen.queryByTestId('upload-progress')).not.toBeInTheDocument()
    })

    it('should allow retry after failed upload', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch
        .mockImplementationOnce(() =>
          new Promise((resolve, reject) =>
            setTimeout(() => reject(new Error('Network error')), 300)
          )
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          })
        )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Wait for first upload to fail
      await waitFor(() => {
        expect(screen.getByText(/Upload failed/)).toBeInTheDocument()
      })

      // Retry upload
      await userEvent.click(uploadButton)

      // Should show progress again
      expect(screen.getByTestId('upload-progress')).toBeInTheDocument()

      // Should succeed on retry
      await waitFor(() => {
        expect(screen.getByText('Upload completed successfully!')).toBeInTheDocument()
      })
    })
  })

  describe('Multiple File Upload Progress', () => {
    it('should track progress for multiple files individually', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 800
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select multiple files
      const fileInput = screen.getByTestId('file-input')
      const files = [
        new File(['# Index'], 'index.md', { type: 'text/markdown' }),
        new File(['# Guide'], 'guide.md', { type: 'text/markdown' }),
        new File(['# API'], 'api.md', { type: 'text/markdown' })
      ]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Should show individual file progress
      await waitFor(() => {
        expect(screen.getByTestId('file-progress-index.md')).toBeInTheDocument()
        expect(screen.getByTestId('file-progress-guide.md')).toBeInTheDocument()
        expect(screen.getByTestId('file-progress-api.md')).toBeInTheDocument()
      })
    })

    it('should show overall progress based on individual file progress', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 600
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select multiple files
      const fileInput = screen.getByTestId('file-input')
      const files = [
        new File(['# File 1'], 'file1.md', { type: 'text/markdown' }),
        new File(['# File 2'], 'file2.md', { type: 'text/markdown' })
      ]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      const overallProgress = screen.getByTestId('overall-progress')

      // Should calculate overall progress correctly
      await waitFor(() => {
        expect(overallProgress).toHaveTextContent('50%')
      })
    })
  })

  describe('Progress Accessibility', () => {
    it('should have proper ARIA labels for screen readers', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 500
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Progress bar should have proper ARIA attributes
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toHaveAttribute('aria-valuenow', '0')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', 'Upload progress')

      // Should update ARIA values during progress
      await waitFor(() => {
        expect(progressBar).toHaveAttribute('aria-valuenow', '50')
      })
    })

    it('should announce status changes to screen readers', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 500
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Should have live region for status announcements
      const statusRegion = screen.getByRole('status')
      expect(statusRegion).toHaveAttribute('aria-live', 'polite')
      expect(statusRegion).toHaveTextContent('Upload started')
    })
  })

  describe('Progress UI States', () => {
    it('should disable input elements during upload', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 500
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // File input should be disabled during upload
      expect(fileInput).toBeDisabled()

      // Remove buttons should be disabled
      const removeButtons = screen.getAllByRole('button', { name: 'Remove' })
      removeButtons.forEach(button => {
        expect(button).toBeDisabled()
      })
    })

    it('should show cancel button during upload', async () => {
      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({
            ok: true,
            json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
          }), 1000
        ))
      )

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Cancel button should appear
      expect(screen.getByRole('button', { name: 'Cancel Upload' })).toBeInTheDocument()
    })

    it('should allow cancelling upload in progress', async () => {
      let shouldReject = true

      const mockFetch = fetch as jest.Mock
      mockFetch.mockImplementation(() => {
        return new Promise((resolve, reject) => {
          if (shouldReject) {
            setTimeout(() => reject(new Error('Upload cancelled')), 300)
          } else {
            resolve({
              ok: true,
              json: async () => ({ success: true, wiki: { id: '1', title: 'Test Wiki' } })
            })
          }
        })
      })

      render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

      // Select and upload files
      const fileInput = screen.getByTestId('file-input')
      const files = [new File(['# Test'], 'index.md', { type: 'text/markdown' })]
      await userEvent.upload(fileInput, files)

      const uploadButton = screen.getByRole('button', { name: 'Upload Wiki' })
      await userEvent.click(uploadButton)

      // Cancel the upload
      const cancelButton = screen.getByRole('button', { name: 'Cancel Upload' })
      await userEvent.click(cancelButton)

      // Should show cancellation message
      await waitFor(() => {
        expect(screen.getByText('Upload cancelled')).toBeInTheDocument()
      })

      // Progress bar should be hidden
      expect(screen.queryByTestId('upload-progress')).not.toBeInTheDocument()
    })
  })
})