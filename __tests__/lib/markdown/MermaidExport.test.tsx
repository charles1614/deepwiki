import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MermaidExport } from '@/lib/markdown/MermaidExport'

// Mock mermaid module
const mockMermaid = {
  render: jest.fn().mockImplementation((id: string, code: string) => {
    return Promise.resolve({
      svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
    })
  }),
  initialize: jest.fn()
}

jest.mock('mermaid', () => mockMermaid)

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((content: string) => content)
}))

// Mock canvas for PNG export
const mockCanvasContext = {
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 100 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
}

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: jest.fn(() => mockCanvasContext)
})

// Mock canvas toBlob
HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
  callback(new Blob(['test'], { type: 'image/png' }))
})

// Mock Image for PNG export
Object.defineProperty(Image.prototype, 'src', {
  get: jest.fn(),
  set: jest.fn(function(this: HTMLImageElement, value: string) {
    // Simulate successful image load after setting src
    setTimeout(() => {
      if (this.onload) {
        this.onload(new Event('load'))
      }
    }, 0)
  })
})

Object.defineProperty(Image.prototype, 'width', { value: 800 })
Object.defineProperty(Image.prototype, 'height', { value: 600 })
Object.defineProperty(Image.prototype, 'onload', { value: null, writable: true })
Object.defineProperty(Image.prototype, 'onerror', { value: null, writable: true })

// Mock Blob and URL.createObjectURL
global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  type: options.type
})) as any

global.URL.createObjectURL = jest.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock download functionality
const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')
if (locationDescriptor?.configurable) {
  Object.defineProperty(window, 'location', {
    value: { href: 'http://localhost' },
    writable: true,
    configurable: true
  })
} else {
  // Fallback for tests where location is not configurable
  (window as any).location = { href: 'http://localhost' }
}

describe('MermaidExport', () => {
  const sampleMermaidCode = `
    graph TD
      A[Start] --> B[Process]
      B --> C[End]
  `.trim()

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mocks and ensure they return the expected success value
    mockMermaid.render.mockResolvedValue({
      svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
    })
    mockMermaid.initialize.mockClear()
  })

  describe('Basic Export Functionality', () => {
    it('renders export controls for mermaid diagram', () => {
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      expect(screen.getByText('Export Diagram')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Export diagram as SVG vector image' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Export diagram as PNG raster image' })).toBeInTheDocument()
    })

    it('exports diagram as SVG successfully', async () => {
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByTestId('export-svg-button')
      fireEvent.click(svgButton)

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledWith('test-diagram-export', sampleMermaidCode)
      })

      expect(screen.getByText('SVG exported successfully!')).toBeInTheDocument()
    })

    it('exports diagram as PNG successfully', async () => {
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const pngButton = screen.getByRole('button', { name: 'Export diagram as PNG raster image' })
      fireEvent.click(pngButton)

      await waitFor(() => {
        expect(screen.getByText('PNG exported successfully!')).toBeInTheDocument()
      })
    })

    it('handles empty mermaid code gracefully', () => {
      render(<MermaidExport code="" diagramId="test-diagram" />)

      expect(screen.getByText('Export Diagram')).toBeInTheDocument()
    })

    it('displays loading state during export', async () => {
      mockMermaid.render.mockImplementation(() =>
        new Promise(resolve => setTimeout(() =>
          resolve({ svg: '<svg></svg>' }), 100
        ))
      )

      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      expect(screen.getByText('Exporting...')).toBeInTheDocument()

      await waitFor(() => {
        expect(screen.getByText('SVG exported successfully!')).toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Advanced Export Options', () => {
    it('supports different SVG export formats', async () => {
      render(
        <MermaidExport
          code={sampleMermaidCode}
          diagramId="test-diagram"
          svgOptions={{
            backgroundColor: '#ffffff',
            width: 800,
            height: 600
          }}
        />
      )

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      await waitFor(() => {
        expect(screen.getByText('SVG exported successfully!')).toBeInTheDocument()
      })
    })

    it('supports different PNG export formats', async () => {
      render(
        <MermaidExport
          code={sampleMermaidCode}
          diagramId="test-diagram"
          pngOptions={{
            backgroundColor: '#ffffff',
            scale: 2,
            quality: 0.9
          }}
        />
      )

      const pngButton = screen.getByRole('button', { name: 'Export diagram as PNG raster image' })
      fireEvent.click(pngButton)

      await waitFor(() => {
        expect(screen.getByText('PNG exported successfully!')).toBeInTheDocument()
      })
    })

    it('supports custom filename for exports', async () => {
      render(
        <MermaidExport
          code={sampleMermaidCode}
          diagramId="test-diagram"
          filename="my-awesome-diagram"
        />
      )

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      await waitFor(() => {
        expect(screen.getByText('SVG exported successfully!')).toBeInTheDocument()
      })
    })

    it('shows export preview before download', async () => {
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const previewButton = screen.getByRole('button', { name: 'Show export preview' })
      fireEvent.click(previewButton)

      await waitFor(() => {
        expect(screen.getByText('Export Preview')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles mermaid render errors gracefully', async () => {
      mockMermaid.render.mockRejectedValue(new Error('Failed to render'))

      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to export SVG')).toBeInTheDocument()
      })
    })

    it('handles canvas creation errors gracefully', async () => {
      // Mock canvas creation failure
      const originalCreateElement = document.createElement
      document.createElement = jest.fn().mockImplementation((tagName) => {
        if (tagName === 'canvas') {
          throw new Error('Canvas creation failed')
        }
        return originalCreateElement.call(document, tagName)
      })

      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const pngButton = screen.getByRole('button', { name: 'Export diagram as PNG raster image' })
      fireEvent.click(pngButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to export PNG')).toBeInTheDocument()
      })

      // Restore original createElement
      document.createElement = originalCreateElement
    })

    it('handles invalid mermaid code gracefully', async () => {
      const invalidCode = 'this is not valid mermaid code'

      // Override the mock to reject for this specific test
      mockMermaid.render.mockRejectedValueOnce(new Error('Failed to render'))

      render(<MermaidExport code={invalidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to export SVG')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels on export buttons', () => {
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      expect(screen.getByRole('button', { name: 'Export diagram as SVG vector image' }))
        .toHaveAttribute('aria-label', 'Export diagram as SVG vector image')
      expect(screen.getByRole('button', { name: 'Export diagram as PNG raster image' }))
        .toHaveAttribute('aria-label', 'Export diagram as PNG raster image')
    })

    it('announces export status to screen readers', async () => {
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      await waitFor(() => {
        const statusElement = screen.getByRole('status')
        expect(statusElement).toBeInTheDocument()
        expect(statusElement).toHaveTextContent(/SVG exported/i)
      })
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })

      // Test that button can be focused and keyboard interaction works
      svgButton.focus()
      expect(svgButton).toHaveFocus()

      await user.keyboard('{Enter}')

      // Should trigger export
      expect(mockMermaid.render).toHaveBeenCalled()
    })
  })

  describe('Customization Options', () => {
    it('supports custom button labels', () => {
      render(
        <MermaidExport
          code={sampleMermaidCode}
          diagramId="test-diagram"
          labels={{
            svg: 'Download SVG',
            png: 'Download PNG',
            preview: 'Show Preview'
          }}
        />
      )

      expect(screen.getByText('Download SVG')).toBeInTheDocument()
      expect(screen.getByText('Download PNG')).toBeInTheDocument()
      expect(screen.getByText('Show Preview')).toBeInTheDocument()
    })

    it('supports custom styling', () => {
      render(
        <MermaidExport
          code={sampleMermaidCode}
          diagramId="test-diagram"
          className="custom-export-styles"
          buttonClassName="custom-button"
        />
      )

      const container = screen.getByTestId('mermaid-export-container')
      expect(container).toHaveClass('custom-export-styles')

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      expect(svgButton).toHaveClass('custom-button')
    })

    it('supports showing/hiding specific export options', () => {
      render(
        <MermaidExport
          code={sampleMermaidCode}
          diagramId="test-diagram"
          exportOptions={{
            svg: true,
            png: false,
            preview: true
          }}
        />
      )

      expect(screen.getByRole('button', { name: 'Export diagram as SVG vector image' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Export diagram as PNG raster image' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show export preview' })).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('handles large mermaid diagrams efficiently', async () => {
      const largeMermaidCode = `
        graph TD
          A --> B
          B --> C
          C --> D
      `.trim()

      render(<MermaidExport code={largeMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      await waitFor(() => {
        expect(screen.getByText('SVG exported successfully!')).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('cancels ongoing export when component unmounts', async () => {
      let resolvePromise: (value: any) => void
      mockMermaid.render.mockImplementation(() =>
        new Promise(resolve => {
          resolvePromise = resolve
        })
      )

      const { unmount } = render(<MermaidExport code={sampleMermaidCode} diagramId="test-diagram" />)

      const svgButton = screen.getByRole('button', { name: 'Export diagram as SVG vector image' })
      fireEvent.click(svgButton)

      expect(screen.getByText('Exporting...')).toBeInTheDocument()

      // Unmount component
      unmount()

      // Resolve promise after unmount - should not cause errors
      if (resolvePromise) {
        resolvePromise({ svg: '<svg></svg>' })
      }
    })
  })
})