import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WikiUpload } from '@/components/WikiUpload'

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('WikiUpload', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render upload form', () => {
    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    expect(screen.getByText('Upload Wiki Files')).toBeInTheDocument()
    expect(screen.getByLabelText(/select markdown files/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /upload wiki/i })).toBeInTheDocument()
    expect(screen.getByText(/index\.md is required/i)).toBeInTheDocument()
  })

  it('should validate file selection', async () => {
    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })

    // Try to upload without selecting files
    await user.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(/please select at least one file/i)).toBeInTheDocument()
    })
  })

  it('should validate index.md requirement', async () => {
    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Overview'], 'overview.md', { type: 'text/markdown' }),
      new File(['# Guide'], 'guide.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(/index\.md file is required/i)).toBeInTheDocument()
    })
  })

  it('should validate file types', async () => {
    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Index'], 'index.md', { type: 'text/markdown' }),
      new File(['fake image'], 'image.png', { type: 'image/png' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(/only markdown \.md files are allowed/i)).toBeInTheDocument()
    })
  })

  it('should display selected files', async () => {
    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Index'], 'index.md', { type: 'text/markdown' }),
      new File(['# Overview'], 'overview.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    await waitFor(() => {
      expect(screen.getByText('index.md')).toBeInTheDocument()
      expect(screen.getByText('overview.md')).toBeInTheDocument()
    })
  })

  it('should handle successful upload', async () => {
    const mockOnUploadSuccess = jest.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        wiki: {
          id: '1',
          title: 'Test Wiki',
          slug: 'test-wiki',
          description: 'Wiki: Test Wiki'
        }
      })
    })

    render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Test Wiki\n\nThis is a test wiki.'], 'index.md', { type: 'text/markdown' }),
      new File(['# Overview\n\nOverview content.'], 'overview.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/wiki/upload', {
        method: 'POST',
        body: expect.any(FormData)
      })
    })

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalledWith({
        id: '1',
        title: 'Test Wiki',
        slug: 'test-wiki',
        description: 'Wiki: Test Wiki'
      })
    })
  })

  it('should handle upload errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: 'index.md file is required'
      })
    })

    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Overview'], 'overview.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(/index\.md file is required/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during upload', async () => {
    mockFetch.mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          wiki: { id: '1', title: 'Test Wiki', slug: 'test-wiki' }
        })
      }), 1000)
    }))

    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Test Wiki'], 'index.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    // Check loading state
    expect(screen.getByRole('button', { name: /uploading/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /uploading/i })).toBeDisabled()
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<WikiUpload onUploadSuccess={jest.fn()} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Test Wiki'], 'index.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByText(/upload failed. please try again./i)).toBeInTheDocument()
    })
  })

  it('should clear file selection after successful upload', async () => {
    const mockOnUploadSuccess = jest.fn()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        wiki: { id: '1', title: 'Test Wiki', slug: 'test-wiki' }
      })
    })

    render(<WikiUpload onUploadSuccess={mockOnUploadSuccess} />)

    const fileInput = screen.getByLabelText(/select markdown files/i)
    const files = [
      new File(['# Test Wiki'], 'index.md', { type: 'text/markdown' })
    ]

    await user.upload(fileInput, files)

    const uploadButton = screen.getByRole('button', { name: /upload wiki/i })
    await user.click(uploadButton)

    await waitFor(() => {
      expect(mockOnUploadSuccess).toHaveBeenCalled()
    })

    // Check that file list is cleared
    expect(screen.queryByText('index.md')).not.toBeInTheDocument()
    expect(screen.getByText(/no files selected/i)).toBeInTheDocument()
  })
})