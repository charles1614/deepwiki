import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WikiVersionHistory from '@/components/WikiVersionHistory'

// Mock API calls
jest.mock('@/lib/api/wiki', () => ({
  getWikiVersions: jest.fn(),
  restoreWikiVersion: jest.fn(),
  compareWikiVersions: jest.fn()
}))

import { getWikiVersions, restoreWikiVersion, compareWikiVersions } from '@/lib/api/wiki'

const mockWiki = {
  id: 'wiki-1',
  title: 'Test Wiki',
  slug: 'test-wiki',
  description: 'Test wiki description'
}

const mockVersions = [
  {
    id: 'version-1',
    version: 3,
    content: '# Version 3\n\nLatest content',
    changeLog: 'Added new section',
    createdAt: '2024-01-03T10:00:00Z',
    user: { email: 'user@example.com' }
  },
  {
    id: 'version-2',
    version: 2,
    content: '# Version 2\n\nUpdated content',
    changeLog: 'Updated introduction',
    createdAt: '2024-01-02T10:00:00Z',
    user: { email: 'user@example.com' }
  },
  {
    id: 'version-3',
    version: 1,
    content: '# Version 1\n\nInitial content',
    changeLog: 'Initial version',
    createdAt: '2024-01-01T10:00:00Z',
    user: { email: 'user@example.com' }
  }
]

const renderComponent = (component: React.ReactElement) => {
  return render(component)
}

describe('WikiVersionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getWikiVersions as jest.Mock).mockResolvedValue(mockVersions)
  })

  it('should render version history list', async () => {
    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Version History')).toBeInTheDocument()
    })

    // Check that versions are displayed
    expect(screen.getByText('Version 3')).toBeInTheDocument()
    expect(screen.getByText('Version 2')).toBeInTheDocument()
    expect(screen.getByText('Version 1')).toBeInTheDocument()
  })

  it('should display version metadata correctly', async () => {
    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText(/Added new section/)).toBeInTheDocument()
    })

    expect(screen.getByText(/Updated introduction/)).toBeInTheDocument()
    expect(screen.getByText(/Initial version/)).toBeInTheDocument()
    expect(screen.getAllByText('user@example.com')).toHaveLength(3)
  })

  it('should allow selecting versions for comparison', async () => {
    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    // Select version 3
    const version3Checkbox = screen.getByLabelText('Select version 3 for comparison')
    fireEvent.click(version3Checkbox)

    // Select version 1
    const version1Checkbox = screen.getByLabelText('Select version 1 for comparison')
    fireEvent.click(version1Checkbox)

    // Compare button should appear
    expect(screen.getByText('Compare Selected')).toBeInTheDocument()
  })

  it('should show compare button only when two versions are selected', async () => {
    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    // Compare button should not be visible initially
    expect(screen.queryByText('Compare Selected')).not.toBeInTheDocument()

    // Select only one version
    const version3Checkbox = screen.getByLabelText('Select version 3 for comparison')
    fireEvent.click(version3Checkbox)

    // Still should not show compare button
    expect(screen.queryByText('Compare Selected')).not.toBeInTheDocument()

    // Select second version
    const version1Checkbox = screen.getByLabelText('Select version 1 for comparison')
    fireEvent.click(version1Checkbox)

    // Now compare button should appear
    expect(screen.getByText('Compare Selected')).toBeInTheDocument()
  })

  it('should restore version when restore button is clicked', async () => {
    ;(restoreWikiVersion as jest.Mock).mockResolvedValue({
      success: true,
      message: 'Version restored successfully'
    })

    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Version 1')).toBeInTheDocument()
    })

    // Click restore button for version 1
    const restoreButton = screen.getByLabelText('Restore version 1')
    fireEvent.click(restoreButton)

    // Confirm restoration
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to restore this version/)).toBeInTheDocument()
    })

    const confirmButton = screen.getByRole('button', { name: 'Restore' })
    const restoreButtons = screen.getAllByRole('button', { name: 'Restore' })
    const modalRestoreButton = restoreButtons.find(button =>
      button.closest('.bg-blue-600') // Modal confirm button has blue background
    )
    fireEvent.click(modalRestoreButton!)

    await waitFor(() => {
      expect(restoreWikiVersion).toHaveBeenCalledWith(mockWiki.id, 1)
    })

    expect(screen.getByText(/Successfully restored to version 1/)).toBeInTheDocument()
  })

  it('should show loading state while fetching versions', () => {
    ;(getWikiVersions as jest.Mock).mockImplementation(() => new Promise(() => {}))

    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    expect(screen.getByTestId('version-history-loading')).toBeInTheDocument()
  })

  it('should show error state when version fetch fails', async () => {
    ;(getWikiVersions as jest.Mock).mockRejectedValue(new Error('Failed to fetch versions'))

    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load version history')).toBeInTheDocument()
    })

    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('should open comparison modal when compare button is clicked', async () => {
    ;(compareWikiVersions as jest.Mock).mockResolvedValue({
      success: true,
      comparison: {
        fromVersion: 1,
        toVersion: 3,
        stats: {
          totalLines: 2,
          added: 1,
          removed: 1,
          modified: 0
        },
        differences: [
          { type: 'added', line: 'New content', lineNumber: 2 },
          { type: 'removed', line: 'Old content', lineNumber: 1 }
        ]
      }
    })

    renderComponent(<WikiVersionHistory wiki={mockWiki} />)

    await waitFor(() => {
      expect(screen.getByText('Version 3')).toBeInTheDocument()
    })

    // Select two versions
    const version3Checkbox = screen.getByLabelText('Select version 3 for comparison')
    const version1Checkbox = screen.getByLabelText('Select version 1 for comparison')

    fireEvent.click(version3Checkbox)
    fireEvent.click(version1Checkbox)

    // Click compare button
    const compareButton = screen.getByText('Compare Selected')
    fireEvent.click(compareButton)

    await waitFor(() => {
      expect(screen.getByText('Version Comparison')).toBeInTheDocument()
    })

    expect(screen.getByText(/Comparing Version 1 → Version 3/)).toBeInTheDocument()
    expect(screen.getByText(/New content/)).toBeInTheDocument()
    expect(screen.getByText(/Old content/)).toBeInTheDocument()
  })
})