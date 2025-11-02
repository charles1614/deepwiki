'use client'

import React, { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'

interface MarkdownRendererProps {
  content: string | null
  theme?: 'light' | 'dark' | 'default' | 'neutral' | 'forest' | 'dark'
  className?: string
}

export function MarkdownRenderer({
  content,
  theme = 'default',
  className = ''
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mermaidInitialized, setMermaidInitialized] = useState(false)

  // Initialize Mermaid on component mount
  useEffect(() => {
    if (!mermaidInitialized) {
      try {
        if (mermaid && typeof mermaid.initialize === 'function') {
          mermaid.initialize({
            startOnLoad: false,
            theme: theme,
            securityLevel: 'loose',
            fontFamily: 'monospace',
            fontSize: 16,
            flowchart: {
              useMaxWidth: true,
              htmlLabels: true,
              curve: 'basis'
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

    const mermaidElements = containerRef.current.querySelectorAll('.mermaid')

    mermaidElements.forEach(async (element) => {
      try {
        // Only process if mermaid is available and has run method
        if (mermaid && typeof mermaid.run === 'function') {
          // Clear previous content
          element.innerHTML = ''

          // Generate unique ID for this diagram
          const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`

          // Run Mermaid
          await mermaid.run({
            nodes: [element],
            suppressErrors: false
          })
        } else {
          // Fallback: show the raw mermaid code if mermaid is not available
          console.warn('Mermaid not available, displaying raw code')
        }
      } catch (error) {
        console.error('Mermaid rendering error:', error)
        // Show error message in the diagram area
        element.innerHTML = `
          <div class="text-red-500 p-4 border border-red-300 rounded">
            <p class="font-semibold">Diagram rendering failed</p>
            <p class="text-sm">Check the mermaid syntax in your markdown code block.</p>
          </div>
        `
      }
    })
  }, [content, mermaidInitialized])

  if (!content) {
    return (
      <div className={`markdown-content prose prose-gray max-w-none ${className}`}>
        <p className="text-gray-500 italic">No content available</p>
      </div>
    )
  }

  // Custom renderer to handle mermaid code blocks using marked extension
  const markedExtension = {
    code: (code: string, language?: string) => {
      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`
      }
      return `<pre><code class="language-${language || ''}">${code}</code></pre>`
    }
  }

  
  // Parse markdown with extension
  const htmlContent = marked(content, {
    extensions: [markedExtension]
  })

  // Sanitize HTML content
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
      'svg', 'g', 'path', 'text', 'circle', 'rect', 'line', 'polygon', // Mermaid SVG elements
      'style', // For inline styles from mermaid
    ],
    ALLOWED_ATTR: [
      'href', 'title', 'alt', 'src', 'width', 'height',
      'class', 'id', 'style', 'viewBox', 'xmlns', 'version',
      'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
      'transform', 'fill', 'stroke', 'stroke-width', 'font-family',
      'font-size', 'text-anchor', 'dominant-baseline', 'alignment-baseline',
      'data-processed' // For mermaid tracking
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ALLOW_DATA_ATTR: false
  })

  return (
    <div
      ref={containerRef}
      className={`markdown-content prose prose-gray max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}