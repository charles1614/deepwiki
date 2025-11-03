'use client'

import React, { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

interface MarkdownRendererProps {
  content: string | null
  theme?: 'light' | 'dark' | 'default' | 'neutral' | 'forest'
  className?: string
}

export function MarkdownRenderer({
  content,
  theme = 'default',
  className = ''
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mermaidInitialized, setMermaidInitialized] = useState(false)
  const [processedContent, setProcessedContent] = useState<string>('')

  // Initialize Mermaid on component mount
  useEffect(() => {
    if (!mermaidInitialized) {
      try {
        if (mermaid && typeof mermaid.initialize === 'function') {
          mermaid.initialize({
            startOnLoad: false,
            theme: theme === 'dark' ? 'dark' : 'default',
            securityLevel: 'loose',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 14,
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
            },
            themeVariables: {
              primaryColor: '#003f5c',
              primaryTextColor: '#fff',
              primaryBorderColor: '#585e6a',
              lineColor: '#585e6a',
              secondaryColor: '#ffa600',
              tertiaryColor: '#bc5090'
            }
          })
        }
      } catch (error) {
        console.warn('Failed to initialize mermaid:', error)
      } finally {
        setMermaidInitialized(true)
      }
    }
  }, [theme, mermaidInitialized])

  // Process Mermaid diagrams after content is rendered
  useEffect(() => {
    if (!content || !containerRef.current || !mermaidInitialized) return

    const processMermaidDiagrams = async () => {
      const mermaidElements = containerRef.current?.querySelectorAll('.mermaid')

      if (mermaidElements.length === 0) return

      for (const element of mermaidElements) {
        try {
          // Only process if mermaid is available
          if (mermaid && typeof mermaid.run === 'function') {
            const code = element.textContent || ''

            // Generate unique ID for this diagram
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
            element.setAttribute('id', id)

            // Clear and render the diagram
            element.innerHTML = ''

            // Create a temporary div with the mermaid code
            const tempDiv = document.createElement('div')
            tempDiv.className = 'mermaid'
            tempDiv.textContent = code
            element.appendChild(tempDiv)

            // Render the diagram
            await mermaid.run({
              nodes: [tempDiv]
            })

            // Wrap SVG for better styling and accessibility
            const svg = tempDiv.querySelector('svg')
            if (svg) {
              svg.setAttribute('role', 'img')
              svg.setAttribute('aria-label', `Mermaid diagram: ${code.split('\n')[0]}`)
              svg.classList.add('w-full', 'h-auto')
            }
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error)
          // Show error message in the diagram area
          element.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p class="font-semibold text-red-800">Diagram rendering failed</p>
              <p class="text-sm text-red-600 mt-1">Check the mermaid syntax in your markdown code block.</p>
              <details class="mt-2">
                <summary class="text-xs text-red-500 cursor-pointer">Show error details</summary>
                <pre class="text-xs text-red-500 mt-1">${error instanceof Error ? error.message : 'Unknown error'}</pre>
              </details>
            </div>
          `
        }
      }
    }

    processMermaidDiagrams()
  }, [content, mermaidInitialized])

  if (!content || content.trim() === '') {
    return (
      <div
        data-testid="markdown-content"
        className={`prose prose-gray max-w-none markdown-content ${className}`}
      >
        <p className="text-gray-500 italic">No content available</p>
      </div>
    )
  }

  // Process markdown content
  useEffect(() => {
    if (!content) {
      setProcessedContent('')
      return
    }

    try {
      let htmlContent: string

      // Check if marked exists and is properly configured
      if (!marked || typeof marked !== 'function') {
        console.warn('Marked library not available')
        setProcessedContent('<p>Markdown renderer not available</p>')
        return
      }

      // Check if we're in test environment or marked doesn't have advanced APIs
      if (process.env.NODE_ENV === 'test' || typeof marked.use !== 'function') {
        // Simple fallback for test environment - use a basic renderer that handles mermaid
        const basicRenderer = {
          code(code: string, language?: string) {
            if (language === 'mermaid') {
              return `<div class="mermaid my-6">${code}</div>`
            }
            return `<pre data-language="${language || 'text'}" class="code-block"><code>${code}</code></pre>`
          },
          heading(text: string, level: number) {
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return `<h${level} id="${id}" class="heading-${level}">${text}</h${level}>`
          }
        }

        // Basic markdown parsing for test environment
        htmlContent = marked(content, { renderer: basicRenderer })
      } else {
        // Try using the new marked.use API
        marked.use({
          renderer: {
            code(code: string, language?: string) {
              if (language === 'mermaid') {
                return `<div class="mermaid my-6">${code}</div>`
              }
              return `<pre data-language="${language || 'text'}" class="code-block"><code>${code}</code></pre>`
            },
            heading(text: string, level: number) {
              const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
              return `<h${level} id="${id}" class="heading-${level}">${text}</h${level}>`
            },
            table(header: string, body: string) {
              return `<div class="overflow-x-auto my-6">
                <table class="min-w-full border-collapse border border-gray-300">
                  <thead class="bg-gray-50">${header}</thead>
                  <tbody class="divide-y divide-gray-200">${body}</tbody>
                </table>
              </div>`
            }
          }
        })
        htmlContent = marked(content)
      }

      // Sanitize HTML content with enhanced allowed tags
      const sanitizedContent = DOMPurify.sanitize(htmlContent, {
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 's', 'del', 'ins',
          'ul', 'ol', 'li',
          'a',
          'img',
          'code', 'pre', 'span',
          'blockquote',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr',
          'div', // For mermaid and custom components
          'svg', 'g', 'path', 'text', 'circle', 'rect', 'line', 'polygon', 'text', 'tspan', // Mermaid SVG elements
          'style', // For inline styles from mermaid
          'details', 'summary' // For error details
        ],
        ALLOWED_ATTR: [
          'href', 'title', 'alt', 'src', 'width', 'height',
          'class', 'id', 'style', 'viewBox', 'xmlns', 'version',
          'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
          'transform', 'fill', 'stroke', 'stroke-width', 'font-family',
          'font-size', 'text-anchor', 'dominant-baseline', 'alignment-baseline',
          'data-language', 'data-processed', 'role', 'aria-label'
        ],
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        ALLOW_DATA_ATTR: false
      })

      setProcessedContent(sanitizedContent)
    } catch (error) {
      console.warn('Failed to process markdown:', error)
      setProcessedContent('<p>Error rendering markdown</p>')
    }
  }, [content])

  const finalContent = processedContent

  return (
    <div
      ref={containerRef}
      data-testid="markdown-content"
      className={`prose prose-gray max-w-none markdown-content ${className}
        prose-headings:scroll-mt-24
        prose-h1:text-3xl prose-h1:font-bold prose-h1:text-gray-900 prose-h1:mb-6 prose-h1:mt-8
        prose-h2:text-2xl prose-h2:font-semibold prose-h2:text-gray-800 prose-h2:mb-4 prose-h2:mt-7
        prose-h3:text-xl prose-h3:font-semibold prose-h3:text-gray-800 prose-h3:mb-3 prose-h3:mt-6
        prose-h4:text-lg prose-h4:font-medium prose-h4:text-gray-700 prose-h4:mb-2 prose-h4:mt-5
        prose-h5:text-base prose-h5:font-medium prose-h5:text-gray-700 prose-h5:mb-2 prose-h5:mt-4
        prose-h6:text-sm prose-h6:font-medium prose-h6:text-gray-600 prose-h6:mb-2 prose-h6:mt-4

        prose-p:text-gray-700 prose-p:leading-7 prose-p:mb-4 prose-p:mt-4

        prose-ul:my-4 prose-li:text-gray-700 prose-li:leading-6
        prose-ol:my-4

        prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:my-6 prose-blockquote:italic prose-blockquote:text-gray-700

        prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-gray-800

        prose-pre:bg-gray-900 prose-pre:text-gray-100

        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-a:font-medium

        prose-strong:text-gray-900 prose-strong:font-semibold

        prose-em:text-gray-700 prose-em:italic

        prose-th:bg-gray-50 prose-th:font-semibold prose-th:text-gray-900 prose-th:border prose-th:border-gray-200 prose-th:px-4 prose-th:py-2
        prose-td:border prose-td:border-gray-200 prose-td:px-4 prose-td:py-2 prose-td:text-gray-700

        prose-img:rounded-lg prose-img:shadow-lg prose-img:my-6

        prose-hr:border-gray-200 prose-hr:my-8

        dark:prose-invert
        dark:prose-headings:text-white
        dark:prose-p:text-gray-300
        dark:prose-li:text-gray-300
        dark:prose-blockquote:bg-gray-800 dark:prose-blockquote:border-blue-400 dark:prose-blockquote:text-gray-300
        dark:prose-code:bg-gray-800 dark:prose-code:text-gray-200
        dark:prose-a:text-blue-400
        dark:prose-strong:text-white
        dark:prose-em:text-gray-300
        dark:prose-th:bg-gray-800 dark:prose-th:border-gray-700 dark:prose-th:text-gray-200
        dark:prose-td:border-gray-700 dark:prose-td:text-gray-300
      `}
    >
      <div dangerouslySetInnerHTML={{ __html: finalContent }} />
    </div>
  )
}