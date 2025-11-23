import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((content: string) => content)
}))

// Mock mermaid module
const mockMermaid = {
  initialize: jest.fn(),
  render: jest.fn().mockResolvedValue({
    svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
  })
}

// Mock the mermaid import
jest.mock('mermaid', () => mockMermaid)

// Mock marked library
jest.mock('marked', () => ({
  marked: {
    parse: jest.fn((content) => {
      if (!content) return ''
      // Simple mock implementation that returns content wrapped in tags based on input
      if (content.startsWith('# ')) return `<h1>${content.substring(2)}</h1>`
      if (content.startsWith('## ')) return `<h2>${content.substring(3)}</h2>`
      if (content.startsWith('### ')) return `<h3>${content.substring(4)}</h3>`
      if (content.startsWith('- ')) return `<ul><li>${content.substring(2)}</li></ul>`
      if (content.startsWith('```')) {
        const match = content.match(/```(\w+)?\n([\s\S]*?)```/)
        if (match) {
          if (match[1] === 'mermaid') return `<div class="mermaid">${match[2]}</div>`
          return `<pre><code>${match[2]}</code></pre>`
        }
      }
      return `<p>${content}</p>`
    }),
    use: jest.fn()
  }
}))

// Mock window dimensions
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024
})

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768
})

describe('MarkdownRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset DOM
    document.body.innerHTML = ''
    // Reset DOMPurify mock
    const { sanitize } = require('dompurify')
    sanitize.mockImplementation((content: string) => content)
  })

  afterEach(() => {
    // Clean up any DOM elements
    document.body.innerHTML = ''
  })

  describe('Basic Markdown Rendering', () => {
    it('renders empty content correctly', () => {
      render(<MarkdownRenderer content={null} />)
      expect(screen.getByText('No content available')).toBeInTheDocument()
    })

    it('renders empty string content correctly', () => {
      render(<MarkdownRenderer content="" />)
      expect(screen.getByText('No content available')).toBeInTheDocument()
    })

    it('renders simple paragraph text', async () => {
      const content = 'This is a simple paragraph.'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('This is a simple paragraph.')).toBeInTheDocument()
      })
    })

    it('renders headings correctly', async () => {
      const content = '# Heading 1\n## Heading 2\n### Heading 3'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('Heading 1')).toBeInTheDocument()
        expect(screen.getByText('Heading 2')).toBeInTheDocument()
        expect(screen.getByText('Heading 3')).toBeInTheDocument()
      })
    })

    it('renders lists correctly', async () => {
      const content = '- Item 1\n- Item 2\n\n1. Ordered 1\n2. Ordered 2'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument()
        expect(screen.getByText('Item 2')).toBeInTheDocument()
        expect(screen.getByText('Ordered 1')).toBeInTheDocument()
        expect(screen.getByText('Ordered 2')).toBeInTheDocument()
      })
    })

    it('renders code blocks correctly', async () => {
      const content = '```javascript\nconst x = 1;\n```'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('const x = 1;')).toBeInTheDocument()
      })
    })

    it('renders inline code correctly', async () => {
      const content = 'This has `inline code` in it.'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('inline code')).toBeInTheDocument()
      })
    })

    it('renders links correctly', async () => {
      const content = '[Link text](https://example.com)'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        const link = screen.getByText('Link text')
        expect(link).toBeInTheDocument()
        expect(link.closest('a')).toHaveAttribute('href', 'https://example.com')
      })
    })

    it('renders blockquotes correctly', async () => {
      const content = '> This is a quote'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('This is a quote')).toBeInTheDocument()
      })
    })

    it('renders tables correctly', async () => {
      const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('Header 1')).toBeInTheDocument()
        expect(screen.getByText('Header 2')).toBeInTheDocument()
        expect(screen.getByText('Cell 1')).toBeInTheDocument()
        expect(screen.getByText('Cell 2')).toBeInTheDocument()
      })
    })
  })

  describe('Mermaid Diagram Rendering', () => {
    it('renders mermaid code blocks correctly', async () => {
      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled()
      })
    })

    it('opens zoom modal when mermaid diagram is clicked', async () => {
      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled()
      })

      // Find and click the diagram
      await waitFor(() => {
        const svg = document.querySelector('svg')
        if (svg) {
          fireEvent.click(svg)
        }
      })

      // Check if modal opens
      await waitFor(() => {
        expect(screen.getByLabelText('Close diagram view')).toBeInTheDocument()
      })
    })

    it('closes zoom modal when close button is clicked', async () => {
      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      // Open modal
      await waitFor(() => {
        const svg = document.querySelector('svg')
        if (svg) {
          fireEvent.click(svg)
        }
      })

      // Close modal
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close diagram view')
        fireEvent.click(closeButton)
      })

      // Check if modal is closed
      await waitFor(() => {
        expect(screen.queryByLabelText('Close diagram view')).not.toBeInTheDocument()
      })
    })

    it('closes zoom modal when Escape key is pressed', async () => {
      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      // Open modal
      await waitFor(() => {
        const svg = document.querySelector('svg')
        if (svg) {
          fireEvent.click(svg)
        }
      })

      // Press Escape
      await waitFor(() => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })

      // Check if modal is closed
      await waitFor(() => {
        expect(screen.queryByLabelText('Close diagram view')).not.toBeInTheDocument()
      })
    })

    it('closes zoom modal when backdrop is clicked', async () => {
      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      // Open modal
      await waitFor(() => {
        const svg = document.querySelector('svg')
        if (svg) {
          fireEvent.click(svg)
        }
      })

      // Click backdrop
      await waitFor(() => {
        const backdrop = screen.getByText('Controls:').closest('div')?.parentElement
        if (backdrop) {
          fireEvent.click(backdrop)
        }
      })

      // Check if modal is closed
      await waitFor(() => {
        expect(screen.queryByLabelText('Close diagram view')).not.toBeInTheDocument()
      })
    })

    it('displays error message when mermaid rendering fails', async () => {
      const errorMessage = 'Mermaid rendering failed'
      mockMermaid.render.mockRejectedValueOnce(new Error(errorMessage))

      const content = '```mermaid\ninvalid syntax\n```'
      render(<MarkdownRenderer content={content} />)

      await waitFor(() => {
        expect(screen.getByText('Diagram rendering failed')).toBeInTheDocument()
      })
    })

    it('shows keyboard instructions in zoom modal', async () => {
      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      // Open modal
      await waitFor(() => {
        const mermaidContainer = document.querySelector('.mermaid')
        const svg = mermaidContainer?.querySelector('svg')
        if (svg) {
          fireEvent.click(svg)
        }
      })

      // Check for instructions
      await waitFor(() => {
        expect(screen.getByText(/Controls:/i)).toBeInTheDocument()
        expect(screen.getByText(/Drag to pan/)).toBeInTheDocument()
        expect(screen.getByText(/Scroll to zoom/)).toBeInTheDocument()
        expect(screen.getByText(/ESC to close/)).toBeInTheDocument()
      })
    })
  })

  describe('Theme Support', () => {
    it('initializes mermaid with default theme', async () => {
      render(<MarkdownRenderer content="# Test" />)

      await waitFor(() => {
        expect(mockMermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: 'default'
          })
        )
      })
    })

    it('initializes mermaid with handwritten theme', async () => {
      render(<MarkdownRenderer content="# Test" theme="handwritten" />)

      await waitFor(() => {
        expect(mockMermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            fontFamily: expect.stringContaining('Comic Neue')
          })
        )
      })
    })

    it('falls back to default theme for invalid theme', async () => {
      render(<MarkdownRenderer content="# Test" theme="invalid" as any />)

      await waitFor(() => {
        expect(mockMermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: 'default'
          })
        )
      })
    })
  })

  describe('Custom Class Names', () => {
    it('applies custom class names', async () => {
      const content = '# Test'
      render(<MarkdownRenderer content={content} className="custom-class" />)

      await waitFor(() => {
        const container = screen.getByText('Test').closest('.prose')
        expect(container).toHaveClass('custom-class')
      })
    })
  })

  describe('Error Handling', () => {
    it('handles DOMPurify sanitization correctly', async () => {
      const maliciousContent = '<script>alert("xss")</script><p>Safe content</p>'
      const { sanitize } = require('dompurify')

      sanitize.mockReturnValue('<p>Safe content</p>')

      render(<MarkdownRenderer content={maliciousContent} />)

      await waitFor(() => {
        expect(sanitize).toHaveBeenCalledWith(
          expect.stringContaining('<script>'),
          expect.any(Object)
        )
        expect(screen.getByText('Safe content')).toBeInTheDocument()
        expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument()
      })
    })

    it('handles mermaid import errors gracefully', async () => {
      // Mock mermaid import to fail
      jest.doMock('mermaid', () => {
        throw new Error('Mermaid import failed')
      })

      const content = '```mermaid\ngraph TD\n    A --> B\n```'
      render(<MarkdownRenderer content={content} />)

      // Should still render other content without mermaid
      await waitFor(() => {
        expect(screen.getByText(/graph TD/)).toBeInTheDocument()
      })
    })
  })
})