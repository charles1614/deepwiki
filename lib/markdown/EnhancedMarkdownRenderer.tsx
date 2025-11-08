'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode'

interface EnhancedMarkdownRendererProps {
  content: string | null
  theme?: 'light' | 'dark' | 'default' | 'neutral' | 'forest'
  className?: string
  enableSyntaxHighlighting?: boolean
  enableCopyButton?: boolean
  enableLineNumbers?: boolean
}

interface ParsedCodeBlock {
  id: string
  content: string
  language: string
  type: 'mermaid' | 'code'
  lineStart: number
  lineEnd: number
}

export function EnhancedMarkdownRenderer({
  content,
  theme = 'default',
  className = '',
  enableSyntaxHighlighting = true,
  enableCopyButton = true,
  enableLineNumbers = false
}: EnhancedMarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mermaidModule, setMermaidModule] = useState<any>(null)
  const [mermaidInitialized, setMermaidInitialized] = useState(false)
  const [processedContent, setProcessedContent] = useState<{
    html: string
    codeBlocks: ParsedCodeBlock[]
  }>({ html: '', codeBlocks: [] })

  // Initialize Mermaid
  useEffect(() => {
    const initMermaid = async () => {
      if (mermaidInitialized) return

      try {
        const mermaid = await import('mermaid')
        const mermaidLib = mermaid.default || mermaid

        if (mermaidLib && typeof mermaidLib.initialize === 'function') {
          setMermaidModule(mermaidLib)

          // Type-safe mermaid theme handling
          const validThemes = ['dark', 'default', 'neutral', 'forest'] as const
          type MermaidTheme = typeof validThemes[number]

          const mermaidTheme: MermaidTheme = validThemes.includes(theme as MermaidTheme)
            ? (theme as MermaidTheme)
            : 'default'

          mermaidLib.initialize({
            startOnLoad: false,
            theme: mermaidTheme as any, // Type assertion for mermaid internal typing
            securityLevel: 'loose',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 14,
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            }
          })

          setMermaidInitialized(true)
        }
      } catch (error) {
        console.warn('Failed to initialize mermaid:', error)
        setMermaidInitialized(true)
      }
    }

    initMermaid()
  }, [theme, mermaidInitialized])

  // Process markdown content
  const processContent = useCallback(async () => {
    if (!content) {
      setProcessedContent({ html: '', codeBlocks: [] })
      return
    }

    try {
      // Collect code blocks during parsing
      const codeBlocks: ParsedCodeBlock[] = []
      let blockId = 0

      marked.use({
        renderer: {
          code(token: any): string {
            const { text, lang } = token
            const id = `code-block-${++blockId}`

            const codeBlock: ParsedCodeBlock = {
              id,
              content: text,
              language: lang || 'text',
              type: lang === 'mermaid' ? 'mermaid' : 'code',
              lineStart: 0,
              lineEnd: 0
            }

            codeBlocks.push(codeBlock)

            if (lang === 'mermaid') {
              return `<div class="mermaid-placeholder" data-block-id="${id}"></div>`
            }

            // For syntax highlighted code, we'll replace it later
            return `<div class="code-block-placeholder" data-block-id="${id}"></div>`
          }
        }
      })

      let htmlContent = marked(content) as string

      // Sanitize HTML
      if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
        htmlContent = DOMPurify.sanitize(htmlContent, {
          ALLOWED_TAGS: [
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
            'ul', 'ol', 'li',
            'a',
            'blockquote',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr',
            'div', // For our placeholders
            'span'
          ],
          ALLOWED_ATTR: [
            'href', 'title', 'alt', 'src', 'width', 'height',
            'class', 'id', 'data-block-id', 'data-mermaid-code'
          ]
        })
      }

      setProcessedContent({ html: htmlContent, codeBlocks })
    } catch (error) {
      console.error('Error processing markdown:', error)
      setProcessedContent({
        html: `<div class="error">Failed to render markdown content</div>`,
        codeBlocks: []
      })
    }
  }, [content])

  // Process content when markdown or dependencies change
  useEffect(() => {
    processContent()
  }, [processContent])

  // Render Mermaid diagrams
  useEffect(() => {
    if (!mermaidInitialized || !containerRef.current) return

    const renderMermaidDiagrams = async () => {
      const mermaidWrappers = Array.from(containerRef.current?.querySelectorAll('.mermaid-placeholder') || [])

      for (const wrapper of mermaidWrappers) {
        const blockId = wrapper.getAttribute('data-block-id')
        const codeBlock = processedContent.codeBlocks.find(block => block.id === blockId)

        if (codeBlock && mermaidModule) {
          try {
            const { svg } = await mermaidModule.render(blockId, codeBlock.content)
            wrapper.innerHTML = svg

            // Add event listeners for zoom functionality
            const svgElement = wrapper.querySelector('svg')
            if (svgElement) {
              svgElement.style.cursor = 'pointer'
              svgElement.setAttribute('role', 'img')
              svgElement.setAttribute('aria-label', `Mermaid diagram: ${blockId}`)
            }
          } catch (error) {
            console.error('Error rendering mermaid diagram:', error)
            wrapper.innerHTML = `<div class="mermaid-error">Failed to render diagram</div>`
          }
        }
      }
    }

    renderMermaidDiagrams()
  }, [processedContent.codeBlocks, mermaidInitialized, mermaidModule])

  // Handle placeholder replacement
  const replacePlaceholders = useCallback((html: string) => {
    const div = document.createElement('div')
    div.innerHTML = html

    // Replace code block placeholders
    processedContent.codeBlocks.forEach(codeBlock => {
      const placeholder = div.querySelector(`[data-block-id="${codeBlock.id}"]`)
      if (placeholder) {
        const replacement = document.createElement('div')

        if (codeBlock.type === 'code') {
          // Create a container for our syntax highlighted component
          replacement.setAttribute('data-code-block', codeBlock.id)
          replacement.setAttribute('data-language', codeBlock.language)
          replacement.setAttribute('data-content', codeBlock.content)
          replacement.setAttribute('data-theme', theme)
          replacement.setAttribute('data-copyable', enableCopyButton.toString())
          replacement.setAttribute('data-line-numbers', enableLineNumbers.toString())
        }

        placeholder.parentNode?.replaceChild(replacement, placeholder)
      }
    })

    return div.innerHTML
  }, [processedContent.codeBlocks, theme, enableCopyButton, enableLineNumbers])

  const processedHtml = replacePlaceholders(processedContent.html)

  return (
    <div
      ref={containerRef}
      className={`prose prose-gray max-w-none markdown-content w-full overflow-hidden ${className}`}
      data-theme={theme}
    >
      <div
        dangerouslySetInnerHTML={{ __html: processedHtml }}
        suppressHydrationWarning
      />

      {/* Render code blocks as React components */}
      {processedContent.codeBlocks
        .filter(block => block.type === 'code')
        .map(codeBlock => (
          <div key={codeBlock.id}>
            <React.Suspense fallback={
              <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                <code className="text-sm font-mono">{codeBlock.content}</code>
              </pre>
            }>
              <SyntaxHighlightedCode
                code={codeBlock.content}
                language={codeBlock.language}
                theme={theme as any}
                copyable={enableCopyButton}
                showLineNumbers={enableLineNumbers}
                className="my-4"
              />
            </React.Suspense>
          </div>
        ))
      }
    </div>
  )
}

export default EnhancedMarkdownRenderer