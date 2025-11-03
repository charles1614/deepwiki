import { render, screen, waitFor } from '@testing-library/react'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'
import { marked } from 'marked'
import mermaid from 'mermaid'

// Mock mermaid for testing
jest.mock('mermaid', () => {
  const mockMermaid = {
    initialize: jest.fn(),
    run: jest.fn().mockResolvedValue(undefined),
    init: jest.fn()
  }
  return { default: mockMermaid }
})

// Mock marked for testing
jest.mock('marked', () => ({
  marked: jest.fn((markdown: string, options?: any) => {
    // Basic markdown parsing for tests - order matters!
    let html = markdown
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        if (lang === 'mermaid') {
          return `<div class="mermaid">${code}</div>`
        }
        return `<pre><code class="language-${lang || ''}">${code}</code></pre>`
      })
      .replace(/^\> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Images must come before links since images start with !
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')

    return html
  })
}))

const mockMarked = marked as jest.MockedFunction<typeof marked>
const mockMermaid = mermaid as jest.Mocked<any>

describe('Mermaid Diagram Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mermaid DOM
    document.body.innerHTML = ''
    global.mermaid = mockMermaid
  })

  afterEach(() => {
    // Clean up any DOM elements
    document.body.innerHTML = ''
  })

  describe('Basic Mermaid Rendering', () => {
    it('should render mermaid diagrams as SVG elements, not code blocks', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      render(<MarkdownRenderer content={markdown} />)

      // Initially, the mermaid div should exist
      const mermaidDiv = screen.getByText('graph TD\n    A --> B')
      expect(mermaidDiv).toBeInTheDocument()
      expect(mermaidDiv.closest('.mermaid')).toBeInTheDocument()

      // Wait for mermaid processing
      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalled()
      })

      // After processing, there should be SVG elements, not text content
      await waitFor(() => {
        const svgElement = document.querySelector('.mermaid svg')
        expect(svgElement).toBeInTheDocument()
        expect(svgElement).toHaveAttribute('viewBox')
      })

      // The original text should not be visible after successful rendering
      expect(screen.queryByText('graph TD\n    A --> B')).not.toBeInTheDocument()
    })

    it('should render multiple mermaid diagrams on the same page', async () => {
      const markdown = `First diagram:
\`\`\`mermaid
graph TD
    A --> B
\`\`\`

Second diagram:
\`\`\`mermaid
graph LR
    C --> D
\`\`\``

      render(<MarkdownRenderer content={markdown} />)

      // Both diagrams should be processed
      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalledTimes(2)
      })

      // Both should render as SVGs
      const svgElements = document.querySelectorAll('.mermaid svg')
      expect(svgElements).toHaveLength(2)
    })

    it('should handle different mermaid diagram types', async () => {
      const markdown = `Flowchart:
\`\`\`mermaid
flowchart TD
    Start --> Stop
\`\`\`

Sequence:
\`\`\`mermaid
sequenceDiagram
    Alice->>Bob: Hello
\`\`\`

Class:
\`\`\`mermaid
classDiagram
    class Animal
    class Dog
    Animal <|-- Dog
\`\`\``

      render(<MarkdownRenderer content={markdown} />)

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalledTimes(3)
      })

      const svgElements = document.querySelectorAll('.mermaid svg')
      expect(svgElements).toHaveLength(3)
    })
  })

  describe('Mermaid Error Handling', () => {
    it('should handle invalid mermaid syntax gracefully', async () => {
      const markdown = '```mermaid\ninvalid mermaid syntax here\n```'

      // Mock mermaid to throw an error
      mockMermaid.run.mockImplementation(() => {
        throw new Error('Mermaid parsing error: Invalid syntax')
      })

      render(<MarkdownRenderer content={markdown} />)

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalled()
      })

      // Should display error message instead of crashing
      const errorElement = document.querySelector('.mermaid .text-red-500')
      expect(errorElement).toBeInTheDocument()
      expect(errorElement).toHaveTextContent(/Diagram rendering failed/)
    })

    it('should handle mermaid library not available', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      // Mock mermaid as undefined/unavailable
      global.mermaid = undefined

      render(<MarkdownRenderer content={markdown} />)

      // Should show the raw code when mermaid is not available
      expect(screen.getByText('graph TD\n    A --> B')).toBeInTheDocument()
    })

    it('should handle mermaid initialization failure', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      // Mock mermaid.initialize to throw error
      mockMermaid.initialize.mockImplementation(() => {
        throw new Error('Mermaid initialization failed')
      })

      render(<MarkdownRenderer content={markdown} />)

      // Should still try to render the diagram
      expect(screen.getByText('graph TD\n    A --> B')).toBeInTheDocument()
    })
  })

  describe('Mermaid Theme Support', () => {
    it('should initialize mermaid with correct theme', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      render(<MarkdownRenderer content={markdown} theme="dark" />)

      await waitFor(() => {
        expect(mockMermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: 'dark',
            startOnLoad: false,
            securityLevel: 'loose'
          })
        )
      })
    })

    it('should support all mermaid themes', async () => {
      const themes = ['default', 'light', 'dark', 'neutral', 'forest']

      for (const theme of themes) {
        const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

        const { unmount } = render(<MarkdownRenderer content={markdown} theme={theme as any} />)

        await waitFor(() => {
          expect(mockMermaid.initialize).toHaveBeenCalledWith(
            expect.objectContaining({
              theme: theme
            })
          )
        })

        unmount()
      }
    })
  })

  describe('Mermaid Performance', () => {
    it('should not re-render already processed diagrams', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      const { rerender } = render(<MarkdownRenderer content={markdown} />)

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalledTimes(1)
      })

      // Re-render with same content - should not process again
      rerender(<MarkdownRenderer content={markdown} />)

      // Mermaid run should not be called again for already processed diagrams
      expect(mockMermaid.run).toHaveBeenCalledTimes(1)
    })

    it('should process new diagrams when content changes', async () => {
      const { rerender } = render(
        <MarkdownRenderer content="```mermaid\ngraph TD\n    A --> B\n```" />
      )

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalledTimes(1)
      })

      // Update content with new diagram
      rerender(<MarkdownRenderer content="```mermaid\ngraph LR\n    C --> D\n```" />)

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle large complex diagrams efficiently', async () => {
      const largeDiagram = `
graph TB
    ${Array.from({ length: 50 }, (_, i) => `Node${i} --> Node${i + 1}`).join('\n    ')}
      `

      const markdown = `\`\`\`mermaid\n${largeDiagram}\n\`\`\``

      const startTime = performance.now()
      render(<MarkdownRenderer content={markdown} />)

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalled()
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render within reasonable time (less than 1 second)
      expect(renderTime).toBeLessThan(1000)
    })
  })

  describe('Mermaid Accessibility', () => {
    it('should add appropriate ARIA labels to rendered diagrams', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      render(<MarkdownRenderer content={markdown} />)

      await waitFor(() => {
        const svgElement = document.querySelector('.mermaid svg')
        expect(svgElement).toHaveAttribute('role', 'img')
        expect(svgElement).toHaveAttribute('aria-label')
      })
    })

    it('should provide descriptive titles for diagrams', async () => {
      const markdown = '```mermaid\ngraph TD\n    Start --> Process --> End\n```'

      render(<MarkdownRenderer content={markdown} />)

      await waitFor(() => {
        const svgElement = document.querySelector('.mermaid svg')
        expect(svgElement).toHaveAttribute('aria-label', expect.stringContaining('diagram'))
      })
    })

    it('should announce diagram rendering status to screen readers', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      render(<MarkdownRenderer content={markdown} />)

      // Check for aria-live regions that announce status
      await waitFor(() => {
        const statusElement = document.querySelector('[aria-live="polite"]')
        expect(statusElement).toBeInTheDocument()
      })
    })
  })

  describe('Mermaid Integration', () => {
    it('should work correctly with Tailwind CSS classes', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      render(<MarkdownRenderer content={markdown} className="custom-styles" />)

      await waitFor(() => {
        expect(mockMermaid.run).toHaveBeenCalled()
      })

      const container = document.querySelector('.markdown-content')
      expect(container).toHaveClass('custom-styles')
    })

    it('should handle mermaid configuration updates', async () => {
      const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

      render(<MarkdownRenderer content={markdown} theme="forest" />)

      await waitFor(() => {
        expect(mockMermaid.initialize).toHaveBeenCalledWith(
          expect.objectContaining({
            theme: 'forest',
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            }
          })
        )
      })
    })
  })
})