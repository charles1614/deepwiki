import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'

// Mock mermaid library at the top level before imports
const mockMermaid = {
  initialize: jest.fn(),
  run: jest.fn().mockImplementation(async ({ nodes }) => {
    // Mock successful mermaid rendering
    await Promise.resolve()
    nodes.forEach((element) => {
      if (element && element.textContent) {
        const svgContent = `
          <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" fill="lightblue" />
            <text x="50" y="50" text-anchor="middle">Test Diagram</text>
          </svg>
        `
        element.innerHTML = svgContent
      }
    })
  }),
  render: jest.fn().mockResolvedValue({
    svg: `
      <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="lightblue" />
        <text x="50" y="50" text-anchor="middle">Test Diagram</text>
      </svg>
    `
  })
}

jest.mock('mermaid', () => ({
  default: mockMermaid,
  ...mockMermaid
}))

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html) => html)
}))

describe('Mermaid Modal Functionality', () => {
  const mermaidContent = `
# Test Document

Here is a mermaid diagram:

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
\`\`\`

Some text after the diagram.
  `

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render mermaid diagram with click-to-zoom functionality', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const mermaidElement = document.querySelector('.mermaid')
      expect(mermaidElement).toBeInTheDocument()

      const svgElement = mermaidElement?.querySelector('svg')
      expect(svgElement).toBeInTheDocument()

      // Check that SVG has click attributes
      expect(svgElement).toHaveAttribute('title', 'Click to zoom diagram')
      expect(svgElement).toHaveAttribute('role', 'img')
      expect(svgElement).toHaveStyle({ cursor: 'pointer' })
    })
  })

  it('should open zoom modal when clicking on mermaid diagram', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Click on the diagram to open zoom modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    // Check that modal is opened
    await waitFor(() => {
      expect(screen.getByText('Diagram Viewer')).toBeInTheDocument()
      expect(screen.getByText('Use mouse wheel to zoom • ESC to close')).toBeInTheDocument()

      // Check zoom controls
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument()
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument()
      expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument()
      expect(screen.getByLabelText('Close zoomed diagram')).toBeInTheDocument()

      // Check that zoom level is at 100%
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('should support mouse wheel zoom in modal', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    // Get the modal container (the element with onWheel handler)
    const modalContainer = screen.getByText('Diagram Viewer').closest('[onWheel]')
    expect(modalContainer).toBeInTheDocument()

    // Test zoom in with wheel up
    fireEvent.wheel(modalContainer!, { deltaY: -10 })

    await waitFor(() => {
      expect(screen.getByText('110%')).toBeInTheDocument()
    })

    // Test zoom out with wheel down
    fireEvent.wheel(modalContainer!, { deltaY: 10 })

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('should support zoom controls buttons', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    // Test zoom in button
    const zoomInButton = screen.getByLabelText('Zoom in')
    await userEvent.click(zoomInButton)

    await waitFor(() => {
      expect(screen.getByText('125%')).toBeInTheDocument()
    })

    // Test zoom out button
    const zoomOutButton = screen.getByLabelText('Zoom out')
    await userEvent.click(zoomOutButton)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    // Test reset button
    await userEvent.click(zoomInButton) // Zoom in first
    await userEvent.click(zoomInButton)

    await waitFor(() => {
      expect(screen.getByText('150%')).toBeInTheDocument()
    })

    const resetButton = screen.getByLabelText('Reset zoom')
    await userEvent.click(resetButton)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('should close modal with ESC key', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('Diagram Viewer')).toBeInTheDocument()
    })

    // Press ESC key
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByText('Diagram Viewer')).not.toBeInTheDocument()
    })
  })

  it('should support keyboard shortcuts for zoom', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    // Test Ctrl+Plus for zoom in
    fireEvent.keyDown(document, { key: '+', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText('125%')).toBeInTheDocument()
    })

    // Test Ctrl+Minus for zoom out
    fireEvent.keyDown(document, { key: '-', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    // Test Ctrl+0 for reset
    fireEvent.keyDown(document, { key: '+', ctrlKey: true })
    fireEvent.keyDown(document, { key: '+', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText('150%')).toBeInTheDocument()
    })

    fireEvent.keyDown(document, { key: '0', ctrlKey: true })

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })

  it('should close modal when clicking close button', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('Diagram Viewer')).toBeInTheDocument()
    })

    // Click close button
    const closeButton = screen.getByLabelText('Close zoomed diagram')
    await userEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Diagram Viewer')).not.toBeInTheDocument()
    })
  })

  it('should close modal when clicking outside content', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('Diagram Viewer')).toBeInTheDocument()
    })

    // Click on the modal backdrop (outside content)
    const modalBackdrop = screen.getByText('Diagram Viewer').closest('.fixed')
    expect(modalBackdrop).toBeInTheDocument()

    fireEvent.click(modalBackdrop!)

    await waitFor(() => {
      expect(screen.queryByText('Diagram Viewer')).not.toBeInTheDocument()
    })
  })

  it('should respect zoom limits (min 25%, max 500%)', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    const zoomInButton = screen.getByLabelText('Zoom in')
    const zoomOutButton = screen.getByLabelText('Zoom out')

    // Test max zoom limit (500%)
    for (let i = 0; i < 20; i++) {
      await userEvent.click(zoomInButton)
    }

    await waitFor(() => {
      expect(screen.getByText('500%')).toBeInTheDocument()
    })

    // Button should be disabled at max zoom
    expect(zoomInButton).toBeDisabled()

    // Test min zoom limit (25%)
    for (let i = 0; i < 20; i++) {
      await userEvent.click(zoomOutButton)
    }

    await waitFor(() => {
      expect(screen.getByText('25%')).toBeInTheDocument()
    })

    // Button should be disabled at min zoom
    expect(zoomOutButton).toBeDisabled()
  })

  it('should show diagram source code in collapsible section', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('View diagram source')).toBeInTheDocument()
    })

    // Expand the source section
    const sourceSummary = screen.getByText('View diagram source')
    await userEvent.click(sourceSummary)

    await waitFor(() => {
      expect(screen.getByText('graph TD')).toBeInTheDocument()
      expect(screen.getByText('A[Start]')).toBeInTheDocument()
      expect(screen.getByText('B{Decision}')).toBeInTheDocument()
    })
  })

  it('should reset zoom when opening new diagram', async () => {
    render(<MarkdownRenderer content={mermaidContent} />)

    await waitFor(() => {
      const svgElement = document.querySelector('.mermaid svg')
      expect(svgElement).toBeInTheDocument()
    })

    // Open modal and zoom in
    const svgElement = document.querySelector('.mermaid svg') as SVGElement
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })

    const zoomInButton = screen.getByLabelText('Zoom in')
    await userEvent.click(zoomInButton)

    await waitFor(() => {
      expect(screen.getByText('125%')).toBeInTheDocument()
    })

    // Close modal
    const closeButton = screen.getByLabelText('Close zoomed diagram')
    await userEvent.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByText('Diagram Viewer')).not.toBeInTheDocument()
    })

    // Reopen modal - should reset to 100%
    fireEvent.click(svgElement)

    await waitFor(() => {
      expect(screen.getByText('100%')).toBeInTheDocument()
    })
  })
})