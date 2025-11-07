import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from '@/lib/markdown/MarkdownRenderer'

// Mock problematic external libraries
jest.mock('mermaid', () => ({
  default: {
    render: jest.fn().mockResolvedValue({ svg: '<svg class="mermaid"></svg>' }),
    init: jest.fn(),
  }
}))

describe('MarkdownRenderer Typography', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Heading Typography', () => {
    it('should apply proper typography styles to H1 headings', () => {
      const markdown = '# This is a Level 1 Heading'

      render(<MarkdownRenderer content={markdown} />)

      const heading = screen.getByRole('heading', { name: 'This is a Level 1 Heading', level: 1 })
      expect(heading).toHaveClass('prose-headings')
      // H1 should be larger than default text
      const fontSize = window.getComputedStyle(heading).fontSize
      expect(parseFloat(fontSize)).toBeGreaterThan(1.5)
    })

    it('should apply proper typography styles to H2 headings', () => {
      const markdown = '## This is a Level 2 Heading'

      render(<MarkdownRenderer content={markdown} />)

      const heading = screen.getByRole('heading', { name: 'This is a Level 2 Heading', level: 2 })
      expect(heading).toHaveClass('prose-headings')
      // H2 should be smaller than H1 but larger than body text
      const fontSize = window.getComputedStyle(heading).fontSize
      expect(parseFloat(fontSize)).toBeGreaterThan(1.2)
    })

    it('should apply proper typography styles to H3 headings', () => {
      const markdown = '### This is a Level 3 Heading'

      render(<MarkdownRenderer content={markdown} />)

      const heading = screen.getByRole('heading', { name: 'This is a Level 3 Heading', level: 3 })
      expect(heading).toHaveClass('prose-headings')
      const fontSize = window.getComputedStyle(heading).fontSize
      expect(parseFloat(fontSize)).toBeGreaterThan(1.1)
    })

    it('should apply proper typography styles to H4 headings', () => {
      const markdown = '#### This is a Level 4 Heading'

      render(<MarkdownRenderer content={markdown} />)

      const heading = screen.getByRole('heading', { name: 'This is a Level 4 Heading', level: 4 })
      expect(heading).toHaveClass('prose-headings')
      const fontWeight = window.getComputedStyle(heading).fontWeight
      expect(fontWeight).toBe('bold')
    })

    it('should maintain proper visual hierarchy between heading levels', () => {
      const markdown = `# Top Level
## Second Level
### Third Level
#### Fourth Level
##### Fifth Level
###### Sixth Level`

      render(<MarkdownRenderer content={markdown} />)

      const h1 = screen.getByRole('heading', { name: 'Top Level', level: 1 })
      const h2 = screen.getByRole('heading', { name: 'Second Level', level: 2 })
      const h3 = screen.getByRole('heading', { name: 'Third Level', level: 3 })

      // H1 should be larger than H2, H2 larger than H3
      const h1Size = parseFloat(window.getComputedStyle(h1).fontSize)
      const h2Size = parseFloat(window.getComputedStyle(h2).fontSize)
      const h3Size = parseFloat(window.getComputedStyle(h3).fontSize)

      expect(h1Size).toBeGreaterThan(h2Size)
      expect(h2Size).toBeGreaterThan(h3Size)
    })
  })

  describe('Paragraph Typography', () => {
    it('should apply proper typography styles to paragraphs', () => {
      const markdown = 'This is a paragraph of text that should have proper typography styling applied to it for readability.'

      render(<MarkdownRenderer content={markdown} />)

      const paragraph = screen.getByText(/This is a paragraph of text/)
      expect(paragraph).toHaveClass('prose-p')
      // Test that paragraph exists and has the class
      expect(paragraph).toBeInTheDocument()
    })

    it('should handle multiple paragraphs with consistent spacing', () => {
      const markdown = `First paragraph with some content.

Second paragraph with more content.

Third paragraph to complete the test.`

      render(<MarkdownRenderer content={markdown} />)

      const paragraphs = screen.getAllByText(/paragraph/)
      expect(paragraphs).toHaveLength(3)

      paragraphs.forEach(paragraph => {
        expect(paragraph).toHaveClass('prose-p')
      })
    })
  })

  describe('List Typography', () => {
    it('should apply proper typography to unordered lists', () => {
      const markdown = `- First item
- Second item
- Third item`

      render(<MarkdownRenderer content={markdown} />)

      const list = screen.getByRole('list')
      expect(list).toHaveClass('prose-ul')
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })

    it('should apply proper typography to ordered lists', () => {
      const markdown = `1. First item
2. Second item
3. Third item`

      render(<MarkdownRenderer content={markdown} />)

      const list = screen.getByRole('list')
      expect(list).toHaveClass('prose-ol')
      const listItems = screen.getAllByRole('listitem')
      expect(listItems).toHaveLength(3)
    })

    it('should style list items properly', () => {
      const markdown = `- First list item
- Second list item`

      render(<MarkdownRenderer content={markdown} />)

      const listItems = screen.getAllByRole('listitem')
      listItems.forEach(item => {
        expect(item).toHaveClass('prose-li')
      })
    })
  })

  describe('Blockquote Typography', () => {
    it('should apply proper typography to blockquotes', () => {
      const markdown = '> This is a blockquote that should be styled appropriately with proper font and spacing.'

      render(<MarkdownRenderer content={markdown} />)

      const blockquote = screen.getByText(/This is a blockquote/)
      expect(blockquote.closest('blockquote')).toHaveClass('prose-blockquote')
    })
  })

  describe('Code Typography', () => {
    it('should apply proper typography to inline code', () => {
      const markdown = 'This is `inline code` in a sentence.'

      render(<MarkdownRenderer content={markdown} />)

      const code = screen.getByText('inline code')
      expect(code).toHaveClass('prose-code')
    })

    it('should apply proper typography to code blocks', () => {
      const markdown = '```javascript\nconst example = "code block";\n```'

      render(<MarkdownRenderer content={markdown} />)

      const pre = screen.getByText('const example = "code block";').closest('pre')
      expect(pre).toHaveClass('prose-pre')
    })
  })

  describe('Link Typography', () => {
    it('should apply proper typography to links', () => {
      const markdown = '[This is a link](https://example.com)'

      render(<MarkdownRenderer content={markdown} />)

      const link = screen.getByRole('link', { name: 'This is a link' })
      expect(link).toHaveClass('prose-a')
      expect(link).toHaveAttribute('data-hover-styles')
    })
  })

  describe('Table Typography', () => {
    it('should apply proper typography to tables', () => {
      const markdown = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`

      render(<MarkdownRenderer content={markdown} />)

      const table = screen.getByRole('table')
      expect(table).toHaveClass('prose-table')
    })

    it('should style table headers and cells properly', () => {
      const markdown = `| Header | Cell |
|--------|------|
| Title  | Data |`

      render(<MarkdownRenderer content={markdown} />)

      const header = screen.getByText('Header')
      const cell = screen.getByText('Data')

      expect(header.closest('th')).toHaveClass('prose-th')
      expect(cell.closest('td')).toHaveClass('prose-td')
    })
  })

  describe('Responsive Typography', () => {
    it('should adapt typography for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const markdown = '# Mobile Heading\n\nMobile paragraph content'

      render(<MarkdownRenderer content={markdown} />)

      const heading = screen.getByRole('heading', { name: 'Mobile Heading', level: 1 })
      expect(heading).toBeInTheDocument()
      // Test that mobile heading exists and has proper class
      expect(heading).toHaveClass('prose-headings')
    })

    it('should maintain readability on larger screens', () => {
      // Mock large desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1920,
      })

      const markdown = 'Large screen content with proper line length for readability.'

      render(<MarkdownRenderer content={markdown} />)

      const paragraph = screen.getByText(/Large screen content/)
      expect(paragraph).toHaveClass('prose-p')
      expect(paragraph).toBeInTheDocument()
    })
  })

  describe('Theme Support', () => {
    it('should apply dark theme typography styles', () => {
      const markdown = '# Dark Theme Heading\n\nDark theme paragraph content'

      render(<MarkdownRenderer content={markdown} theme="dark" />)

      const heading = screen.getByRole('heading', { name: 'Dark Theme Heading', level: 1 })
      expect(heading).toHaveClass('prose-headings')
      expect(heading).toBeInTheDocument()
    })

    it('should apply light theme typography styles', () => {
      const markdown = '# Light Theme Heading\n\nLight theme paragraph content'

      render(<MarkdownRenderer content={markdown} theme="light" />)

      const heading = screen.getByRole('heading', { name: 'Light Theme Heading', level: 1 })
      expect(heading).toHaveClass('prose-headings')
      expect(heading).toBeInTheDocument()
    })
  })
})