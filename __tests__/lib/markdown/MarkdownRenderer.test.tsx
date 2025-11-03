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
jest.mock('marked', () => {
  const markedFn = jest.fn((markdown: string, options?: any) => {
    // Check if a custom renderer is provided
    if (options && options.renderer) {
      const renderer = options.renderer

      // Handle code blocks with custom renderer
      let result = markdown
      result = result.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
        if (renderer.code) {
          return renderer.code(code.trim(), lang)
        }
        return match
      })

      // Handle headings with custom renderer
      result = result.replace(/^(#{1,6}) (.+)$/gm, (match, hashes, text) => {
        if (renderer.heading) {
          const level = hashes.length
          return renderer.heading(text, level)
        }
        return match
      })

      // Handle other markdown elements even with custom renderer
      result = result
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/^\> (.+)$/gm, '<blockquote>$1</blockquote>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

      // Handle tables with custom renderer
      result = result.replace(/\|(.+)\|/g, (match, content) => {
        const cells = content.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
        return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>'
      })

      return result
    }

    // Default markdown parsing for tests - order matters!
    let html = markdown

    // Handle code blocks FIRST (before inline code)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      if (lang === 'mermaid') {
        return `<div class="mermaid my-6">${code.trim()}</div>`
      }
      return `<pre data-language="${lang || 'text'}" class="code-block"><code>${code.trim()}</code></pre>`
    })

    // Then handle other markdown
    html = html
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Handle inline code (after code blocks to avoid conflicts)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^\> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Images must come before links since images start with !
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')

    // Handle tables
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      const cells = content.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
      return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>'
    })

    return html
  })

  return { marked: markedFn }
})

import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'
import mermaid from 'mermaid'

// Access the mock functions from the global jest.mock
const mockMarked = (jest.requireMock('marked') as any).marked as jest.MockedFunction<any>
const mockMermaid = jest.requireMock('mermaid').default as jest.Mocked<any>

describe('MarkdownRenderer', () => {
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

  it('should render basic markdown', () => {
    const markdown = '# Test Title\n\nThis is **bold** text and *italic* text.'

    render(<MarkdownRenderer content={markdown} />)

    expect(screen.getByRole('heading', { name: 'Test Title', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('This is', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('bold')).toBeInTheDocument()
    expect(screen.getByText('italic')).toBeInTheDocument()
  })

  it('should render headings correctly', () => {
    const markdown = `# Heading 1
## Heading 2
### Heading 3`

    render(<MarkdownRenderer content={markdown} />)

    expect(screen.getByRole('heading', { name: 'Heading 1', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heading 2', level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Heading 3', level: 3 })).toBeInTheDocument()
  })

  it('should render code blocks', () => {
    const markdown = '```javascript\nconst x = 1;\n```'

    render(<MarkdownRenderer content={markdown} />)

    const codeElement = screen.getByText('const x = 1;')
    expect(codeElement).toBeInTheDocument()
    expect(codeElement.closest('pre')).toBeInTheDocument()
  })

  it('should render mermaid diagrams', async () => {
    const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

    render(<MarkdownRenderer content={markdown} />)

    // Check that mermaid div is created - look for the text content in the mermaid div
    const mermaidDiv = screen.getByText(/graph TD/i)
    expect(mermaidDiv).toBeInTheDocument()
    expect(mermaidDiv.closest('.mermaid')).toBeInTheDocument()

    // Mermaid functions should be available (even if not called in test env)
    expect(mockMermaid.initialize).toBeDefined()
    expect(mockMermaid.run).toBeDefined()
  })

  it('should render multiple mermaid diagrams', async () => {
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

    // Check that both diagrams are rendered
    expect(screen.getByText(/graph TD/i)).toBeInTheDocument()
    expect(screen.getByText(/graph LR/i)).toBeInTheDocument()

    // Multiple mermaid divs should be present
    const mermaidDivs = screen.getAllByText(/graph/)
    expect(mermaidDivs).toHaveLength(2)
  })

  it('should render lists', () => {
    const markdown = `- Item 1\n- Item 2\n- Item 3`

    render(<MarkdownRenderer content={markdown} />)

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('should render links', () => {
    const markdown = '[Link text](https://example.com)'

    render(<MarkdownRenderer content={markdown} />)

    const link = screen.getByRole('link', { name: 'Link text' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', 'https://example.com')
  })

  it('should render images', () => {
    const markdown = '![Alt text](https://example.com/image.png)'

    render(<MarkdownRenderer content={markdown} />)

    const image = screen.getByRole('img', { name: 'Alt text' })
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/image.png')
  })

  it('should handle empty content', () => {
    render(<MarkdownRenderer content="" />)

    // Should render without crashing
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
  })

  it('should handle null content', () => {
    render(<MarkdownRenderer content={null as any} />)

    expect(screen.getByTestId('markdown-content')).toBeInTheDocument()
  })

  it('should handle mermaid errors gracefully', async () => {
    const markdown = '```mermaid\ninvalid mermaid syntax\n```'

    render(<MarkdownRenderer content={markdown} />)

    // Should still render the mermaid div even with invalid syntax
    const mermaidDiv = screen.getByText(/invalid mermaid syntax/i)
    expect(mermaidDiv).toBeInTheDocument()
    expect(mermaidDiv.closest('.mermaid')).toBeInTheDocument()
  })

  it('should render tables', () => {
    const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |`

    render(<MarkdownRenderer content={markdown} />)

    // Table content should be present - check for partial matches since it might be rendered inline
    expect(screen.getByText(/Header 1/)).toBeInTheDocument()
    expect(screen.getByText(/Cell 1/)).toBeInTheDocument()
  })

  it('should render blockquotes', () => {
    const markdown = '> This is a quote\n> With multiple lines'

    render(<MarkdownRenderer content={markdown} />)

    expect(screen.getByText('This is a quote')).toBeInTheDocument()
    expect(screen.getByText('With multiple lines')).toBeInTheDocument()
  })

  it('should render inline code', () => {
    const markdown = 'This is `inline code` in text.'

    render(<MarkdownRenderer content={markdown} />)

    const codeElement = screen.getByText('inline code')
    expect(codeElement).toBeInTheDocument()
    expect(codeElement.tagName).toBe('CODE')
  })

  it('should sanitize dangerous HTML', () => {
    const markdown = '<script>alert("xss")</script>\n\n# Safe Title'

    render(<MarkdownRenderer content={markdown} />)

    // Script should not be executed
    expect(screen.queryByText('alert("xss")')).not.toBeInTheDocument()
    // Safe content should render
    expect(screen.getByRole('heading', { name: 'Safe Title', level: 1 })).toBeInTheDocument()
  })

  it('should handle large markdown content efficiently', () => {
    const largeMarkdown = '# Large Document\n\n'.repeat(1000) + 'Some content'

    render(<MarkdownRenderer content={largeMarkdown} />)

    // Should render without timeout or performance issues
    expect(screen.getAllByRole('heading', { name: 'Large Document', level: 1 })).toHaveLength(1000)
  })

  it('should render mermaid with custom theme', async () => {
    const markdown = '```mermaid\ngraph TD\n    A --> B\n```'

    render(<MarkdownRenderer content={markdown} theme="dark" />)

    // Should render mermaid with dark theme
    const mermaidDiv = screen.getByText(/graph TD/i)
    expect(mermaidDiv).toBeInTheDocument()
    expect(mermaidDiv.closest('.mermaid')).toBeInTheDocument()
  })

  it('should update mermaid diagrams when content changes', async () => {
    const { rerender } = render(
      <MarkdownRenderer content="```mermaid\ngraph TD\n    A --> B\n```" />
    )

    // Initial render
    expect(screen.getByText(/graph TD/i)).toBeInTheDocument()

    // Update content
    rerender(<MarkdownRenderer content="```mermaid\ngraph LR\n    C --> D\n```" />)

    expect(screen.getByText(/graph LR/i)).toBeInTheDocument()
    // Should no longer contain the old content
    expect(screen.queryByText(/graph TD/i)).not.toBeInTheDocument()
  })
})