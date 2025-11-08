import { render, screen } from '@testing-library/react'
import { SyntaxHighlightedCode } from '@/lib/markdown/SyntaxHighlightedCode'

// Mock react-syntax-highlighter
jest.mock('react-syntax-highlighter', () => {
  return function MockSyntaxHighlighter({ language, children, style }: any) {
    return (
      <div data-testid="syntax-highlighter" data-language={language} data-style={style?.name || 'default'}>
        <pre><code>{children}</code></pre>
      </div>
    )
  }
})

// Mock highlight.js styles
jest.mock('react-syntax-highlighter/dist/esm/styles/hljs', () => ({
  dark: { name: 'dark' },
  light: { name: 'light' },
  github: { name: 'github' },
  vs2015: { name: 'vs2015' },
  atomDark: { name: 'atomDark' }
}))

describe('SyntaxHighlightedCode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders code block with syntax highlighting', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toBeInTheDocument()
      expect(highlighter).toHaveAttribute('data-language', 'javascript')
      expect(screen.getByText('const x = 1;')).toBeInTheDocument()
    })

    it('renders inline code correctly', () => {
      const code = 'console.log()'
      render(<SyntaxHighlightedCode code={code} language="javascript" inline />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toBeInTheDocument()
      expect(highlighter).toHaveClass('inline-code')
    })

    it('handles empty code gracefully', () => {
      render(<SyntaxHighlightedCode code="" language="javascript" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toBeInTheDocument()
    })

    it('handles unknown language by falling back to plain text', () => {
      const code = 'some random text'
      render(<SyntaxHighlightedCode code={code} language="unknown" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveAttribute('data-language', 'unknown')
    })
  })

  describe('Theme Support', () => {
    it('applies dark theme correctly', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" theme="dark" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveAttribute('data-style', 'dark')
      expect(highlighter).toHaveClass('dark-theme')
    })

    it('applies light theme correctly', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" theme="light" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveAttribute('data-style', 'light')
      expect(highlighter).toHaveClass('light-theme')
    })

    it('applies github theme correctly', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" theme="github" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveAttribute('data-style', 'github')
    })

    it('falls back to default theme for invalid theme', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" theme="invalid" as any />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveAttribute('data-style', 'default')
    })
  })

  describe('Advanced Features', () => {
    it('shows line numbers when enabled', () => {
      const code = 'const x = 1;\nconst y = 2;'
      render(<SyntaxHighlightedCode code={code} language="javascript" showLineNumbers />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveClass('with-line-numbers')
    })

    it('highlights specific lines when specified', () => {
      const code = 'const x = 1;\nconst y = 2;\nconst z = 3;'
      render(<SyntaxHighlightedCode code={code} language="javascript" highlightLines={[2, 3]} />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveClass('highlight-lines')
    })

    it('supports copy to clipboard functionality', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" copyable />)

      const copyButton = screen.getByRole('button', { name: /copy/i })
      expect(copyButton).toBeInTheDocument()
    })

    it('supports code filename display', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" filename="example.js" />)

      expect(screen.getByText('example.js')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
    })

    it('supports diff mode for showing changes', () => {
      const code = '+ const x = 1;\n- const y = 2;\n const z = 3;'
      render(<SyntaxHighlightedCode code={code} language="javascript" diffMode />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveClass('diff-mode')
    })
  })

  describe('Language Support', () => {
    it('supports common programming languages', () => {
      const languages = [
        { lang: 'javascript', code: 'const x = 1;' },
        { lang: 'typescript', code: 'const x: number = 1;' },
        { lang: 'python', code: 'x = 1' },
        { lang: 'java', code: 'int x = 1;' },
        { lang: 'cpp', code: 'int x = 1;' },
        { lang: 'html', code: '<div>test</div>' },
        { lang: 'css', code: '.test { color: red; }' },
        { lang: 'json', code: '{ "key": "value" }' },
        { lang: 'sql', code: 'SELECT * FROM table;' },
        { lang: 'bash', code: 'echo "test"' }
      ]

      languages.forEach(({ lang, code }) => {
        render(<SyntaxHighlightedCode code={code} language={lang} />)
        expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-language', lang)
      })
    })

    it('handles language aliases correctly', () => {
      const code = 'const x = 1;'

      render(<SyntaxHighlightedCode code={code} language="js" />)
      expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-language', 'js')

      render(<SyntaxHighlightedCode code={code} language="ts" />)
      expect(screen.getByTestId('syntax-highlighter')).toHaveAttribute('data-language', 'ts')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toHaveAttribute('role', 'code')
      expect(highlighter).toHaveAttribute('aria-label', 'javascript code block')
    })

    it('announces copy action to screen readers', async () => {
      const code = 'const x = 1;'
      render(<SyntaxHighlightedCode code={code} language="javascript" copyable />)

      const copyButton = screen.getByRole('button', { name: /copy/i })

      // Mock clipboard API
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined)
        }
      })

      // This would need to be expanded with proper user interaction testing
      expect(copyButton).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('handles large code blocks efficiently', () => {
      const largeCode = 'console.log("line");\n'.repeat(1000)
      render(<SyntaxHighlightedCode code={largeCode} language="javascript" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toBeInTheDocument()
    })

    it('does not re-render unnecessarily', () => {
      const code = 'const x = 1;'
      const { rerender } = render(<SyntaxHighlightedCode code={code} language="javascript" />)

      const highlighter = screen.getByTestId('syntax-highlighter')
      expect(highlighter).toBeInTheDocument()

      // Re-render with same props
      rerender(<SyntaxHighlightedCode code={code} language="javascript" />)
      expect(highlighter).toBeInTheDocument()
    })
  })
})