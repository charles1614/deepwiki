import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { EnhancedMarkdownRenderer } from '@/lib/markdown/EnhancedMarkdownRenderer'

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((content: string) => content)
}))

// Mock mermaid module with proper dynamic import support
const mockMermaid = {
  initialize: jest.fn(),
  render: jest.fn().mockResolvedValue({
    svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>'
  }),
  parse: jest.fn().mockReturnValue(true)
}

jest.mock('mermaid', () => mockMermaid)

describe('EnhancedMarkdownRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset DOMPurify mock
    const { sanitize } = require('dompurify')
    sanitize.mockImplementation((content: string) => content)

    // Reset mermaid mock calls
    mockMermaid.initialize.mockClear()
    mockMermaid.render.mockClear()
    mockMermaid.parse.mockClear()
  })

  it('renders empty content correctly', () => {
    render(<EnhancedMarkdownRenderer content={null} />)
    expect(screen.getByText('No content available')).toBeInTheDocument()
  })

  it('renders markdown with syntax highlighting enabled', async () => {
    const content = `
# Hello World

This is a paragraph with some text.

\`\`\`javascript
const x = 1;
console.log(x);
\`\`\`

Some more text.
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} enableSyntaxHighlighting />)

    await waitFor(() => {
      expect(screen.getByText('Hello World')).toBeInTheDocument()
      expect(screen.getByText('This is a paragraph with some text.')).toBeInTheDocument()
      expect(screen.getByText('Some more text.')).toBeInTheDocument()
    })
  })

  it('renders code blocks with syntax highlighting', async () => {
    const content = `
\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`
    `.trim()

    render(
      <EnhancedMarkdownRenderer
        content={content}
        enableSyntaxHighlighting={true}
        enableCopyButton={true}
        theme="dark"
      />
    )

    await waitFor(() => {
      const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
      expect(syntaxHighlighter).toBeInTheDocument()
      expect(syntaxHighlighter).toHaveAttribute('data-language', 'javascript')
      expect(syntaxHighlighter).toHaveAttribute('data-style', 'fallback')
    })
  })

  it('renders mermaid diagrams correctly', async () => {
    const content = `
\`\`\`mermaid
graph TD
    A --> B
\`\`\`
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} />)

    await waitFor(() => {
      expect(mockMermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'default'
        })
      )
    })
  })

  it('applies theme correctly', async () => {
    const content = `
\`\`\`javascript
const x = 1;
\`\`\`
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} theme="dark" />)

    await waitFor(() => {
      expect(mockMermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'dark'
        })
      )
    })
  })

  it('enables copy button when requested', async () => {
    const content = `
\`\`\`javascript
const x = 1;
\`\`\`
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} enableCopyButton={true} />)

    await waitFor(() => {
      const copyButton = screen.queryByTestId('copy-button')
      expect(copyButton).toBeInTheDocument()
    })
  })

  it('enables line numbers when requested', async () => {
    const content = `
\`\`\`javascript
const x = 1;
const y = 2;
\`\`\`
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} enableLineNumbers={true} />)

    await waitFor(() => {
      const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
      expect(syntaxHighlighter).toBeInTheDocument()
    })
  })

  it('handles multiple code blocks of different languages', async () => {
    const content = `
\`\`\`javascript
const x = 1;
\`\`\`

\`\`\`python
x = 1
\`\`\`

\`\`\`css
.test { color: red; }
\`\`\`
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} enableSyntaxHighlighting />)

    await waitFor(() => {
      const highlighters = screen.getAllByTestId('syntax-highlighter')
      expect(highlighters).toHaveLength(3)

      expect(highlighters[0]).toHaveAttribute('data-language', 'javascript')
      expect(highlighters[1]).toHaveAttribute('data-language', 'python')
      expect(highlighters[2]).toHaveAttribute('data-language', 'css')
    })
  })

  it('renders inline code correctly', async () => {
    const content = 'This has \`inline code\` in it.'
    render(<EnhancedMarkdownRenderer content={content} />)

    await waitFor(() => {
      expect(screen.getByText('This has')).toBeInTheDocument()
      expect(screen.getByText('inline code')).toBeInTheDocument()
      expect(screen.getByText('in it.')).toBeInTheDocument()
    })
  })

  it('handles syntax highlighting gracefully when disabled', async () => {
    const content = `
\`\`\`javascript
const x = 1;
\`\`\`
    `.trim()

    render(<EnhancedMarkdownRenderer content={content} enableSyntaxHighlighting={false} />)

    await waitFor(() => {
      // Should render fallback code block
      const codeElement = screen.getByText('const x = 1;')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement.closest('pre')).toHaveClass('bg-gray-100')
    })
  })

  it('renders mixed content with code and mermaid', async () => {
    const content = `
# Mixed Content

Here's some code:

\`\`\`javascript
function hello() {
  return "Hello";
}
\`\`\`

And here's a diagram:

\`\`\`mermaid
graph LR
    Start --> End
\`\`\`
    `.trim()

    render(
      <EnhancedMarkdownRenderer
        content={content}
        enableSyntaxHighlighting={true}
        theme="light"
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Mixed Content')).toBeInTheDocument()
      expect(screen.getByText('Here\'s some code:')).toBeInTheDocument()
      expect(screen.getByText('And here\'s a diagram:')).toBeInTheDocument()

      const syntaxHighlighter = screen.getByTestId('syntax-highlighter')
      expect(syntaxHighlighter).toHaveAttribute('data-language', 'javascript')

      expect(mockMermaid.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          theme: 'light'
        })
      )
    })
  })

  it('applies custom className correctly', async () => {
    const content = '# Test'
    render(<EnhancedMarkdownRenderer content={content} className="custom-class" />)

    await waitFor(() => {
      const container = screen.getByText('Test').closest('.prose')
      expect(container).toHaveClass('custom-class')
    })
  })

  it('handles large markdown content efficiently', async () => {
    const largeContent = `
# Large Content

${Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}`).join('\n\n')}

\`\`\`javascript
${Array.from({ length: 50 }, (_, i) => `const line${i + 1} = ${i + 1};`).join('\n')}
\`\`\`

${Array.from({ length: 100 }, (_, i) => `## Heading ${i + 1}`).join('\n')}
    `.trim()

    render(<EnhancedMarkdownRenderer content={largeContent} />)

    await waitFor(() => {
      expect(screen.getByText('Large Content')).toBeInTheDocument()
      expect(screen.getByText('Paragraph 1')).toBeInTheDocument()
      expect(screen.getByText('Heading 1')).toBeInTheDocument()
    })
  })
})