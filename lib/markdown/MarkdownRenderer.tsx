'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

interface MarkdownRendererProps {
  content: string | null
  theme?: 'light' | 'dark' | 'default' | 'neutral' | 'forest'
  className?: string
}

interface ZoomedDiagram {
  code: string
  svg: string
}

export function MarkdownRenderer({
  content,
  theme = 'default',
  className = ''
}: MarkdownRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mermaidModule, setMermaidModule] = useState<any>(null)
  const [mermaidInitialized, setMermaidInitialized] = useState(false)
  const [processedContent, setProcessedContent] = useState<string>('')
  const [zoomedDiagram, setZoomedDiagram] = useState<ZoomedDiagram | null>(null)
  const [scale, setScale] = useState(1)
  const [autoScale, setAutoScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [reattachHandlers, setReattachHandlers] = useState(0)

  // Initialize Mermaid
  useEffect(() => {
    const initMermaid = async () => {
      if (mermaidInitialized) return

      try {
        const mermaid = await import('mermaid')
        const mermaidLib = mermaid.default || mermaid

        if (mermaidLib && typeof mermaidLib.initialize === 'function') {
          setMermaidModule(mermaidLib)

          const mermaidTheme = ['light', 'dark', 'default', 'neutral', 'forest'].includes(theme)
            ? theme
            : 'default'

          mermaidLib.initialize({
            startOnLoad: false,
            theme: mermaidTheme,
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
      setProcessedContent('')
      return
    }

    try {
      marked.use({
        renderer: {
          code(token: any): string {
            const { text, lang } = token
            if (lang === 'mermaid') {
              return `<div class="mermaid-wrapper" data-mermaid-code="${encodeURIComponent(text)}"><div class="mermaid">${text}</div></div>`
            }
            return `<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code class="text-sm font-mono">${text}</code></pre>`
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
            'img',
            'code', 'pre', 'span',
            'blockquote',
            'table', 'thead', 'tbody', 'tr', 'th', 'td',
            'hr',
            'div',
            'svg', 'g', 'path', 'text', 'circle', 'rect', 'line', 'polygon', 'tspan',
            'style'
          ],
          ALLOWED_ATTR: [
            'href', 'title', 'alt', 'src', 'width', 'height',
            'class', 'id', 'style', 'viewBox', 'xmlns', 'version',
            'd', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2',
            'transform', 'fill', 'stroke', 'stroke-width', 'font-family',
            'font-size', 'text-anchor', 'data-mermaid-code'
          ]
        })
      }

      setProcessedContent(htmlContent)
    } catch (error) {
      console.error('Failed to process markdown:', error)
      setProcessedContent(`<p class="text-red-600">Error rendering markdown: ${error instanceof Error ? error.message : 'Unknown error'}</p>`)
    }
  }, [content])

  // Process content when dependencies change
  useEffect(() => {
    processContent()
  }, [processContent])

  // Render Mermaid diagrams after DOM update
  useEffect(() => {
    if (!containerRef.current || !mermaidModule || !processedContent) return

    const renderMermaidDiagrams = async () => {
      const mermaidWrappers = containerRef.current?.querySelectorAll('.mermaid-wrapper')

      for (const wrapper of mermaidWrappers) {
        const mermaidDiv = wrapper.querySelector('.mermaid')
        if (!mermaidDiv) continue

        const code = decodeURIComponent(wrapper.getAttribute('data-mermaid-code') || '')
        if (!code.trim()) continue

        const svgElement = mermaidDiv.querySelector('svg')

        // Check if already rendered but missing click handler
        if (svgElement && mermaidDiv.hasAttribute('data-rendered')) {
          // Re-attach click handler if missing
          if (!(svgElement as any)._clickHandler) {
            console.log('Re-attaching click handler to existing diagram')
            svgElement.style.cursor = 'pointer'
            svgElement.setAttribute('title', 'Click to zoom diagram')
            svgElement.classList.add('hover:opacity-80', 'transition-opacity')

            const handleClick = () => {
              console.log('Diagram clicked, opening zoom modal')
              setZoomedDiagram({ code, svg: svgElement.outerHTML })
              setScale(1)
              setPosition({ x: 0, y: 0 })
            }

            svgElement.addEventListener('click', handleClick)
            ;(svgElement as any)._clickHandler = handleClick
          }
          continue
        }

        // Skip if already rendered and has click handler
        if (svgElement && mermaidDiv.hasAttribute('data-rendered')) continue

        try {
          // Clean and normalize the mermaid code
          const cleanedCode = code.trim()
          if (!cleanedCode) {
            throw new Error('Empty mermaid code')
          }

          console.log('Rendering mermaid diagram with code:', cleanedCode.substring(0, 100) + '...')
          
          // Validate syntax before rendering (mermaid 11.x supports parse method)
          if (mermaidModule.parse && typeof mermaidModule.parse === 'function') {
            try {
              mermaidModule.parse(cleanedCode)
            } catch (parseError) {
              throw new Error(`Syntax error: ${parseError instanceof Error ? parseError.message : 'Invalid mermaid syntax'}`)
            }
          }

          const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
          
          // Mermaid 11.x render API
          const result = await mermaidModule.render(uniqueId, cleanedCode)
          
          // Handle different return formats from mermaid render
          const svg = result.svg || result || ''
          
          if (!svg || typeof svg !== 'string') {
            throw new Error('Mermaid render returned invalid result')
          }

          console.log('Mermaid render successful, SVG length:', svg.length)

          mermaidDiv.innerHTML = svg
          mermaidDiv.setAttribute('data-rendered', 'true')

          // Add click handler for zoom
          const newSvgElement = mermaidDiv.querySelector('svg')
          if (newSvgElement) {
            newSvgElement.style.cursor = 'pointer'
            newSvgElement.setAttribute('title', 'Click to zoom diagram')
            newSvgElement.classList.add('hover:opacity-80', 'transition-opacity')

            const handleClick = () => {
              console.log('Diagram clicked, opening zoom modal')
              setZoomedDiagram({ code: cleanedCode, svg })
              setScale(1)
              setPosition({ x: 0, y: 0 })
            }

            newSvgElement.addEventListener('click', handleClick)
            ;(newSvgElement as any)._clickHandler = handleClick
          }
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error)
          
          // Extract more detailed error information
          let errorMessage = 'Unknown error'
          if (error instanceof Error) {
            errorMessage = error.message
            // Check for common syntax errors
            if (errorMessage.includes('Syntax error') || errorMessage.includes('parse')) {
              errorMessage = `Syntax error in mermaid diagram: ${errorMessage}`
            }
          }
          
          // Escape HTML in error message and code for safe display
          const escapeHtml = (str: string) => {
            const div = document.createElement('div')
            div.textContent = str
            return div.innerHTML
          }
          
          const escapedErrorMessage = escapeHtml(errorMessage)
          const escapedCode = escapeHtml(code.substring(0, 500))
          
          mermaidDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p class="font-semibold">Mermaid Diagram Rendering Failed</p>
              <p class="text-sm mt-1">Check the mermaid syntax in your markdown code block.</p>
              <p class="text-xs mt-1 font-mono break-all">Error: ${escapedErrorMessage}</p>
              <details class="mt-2 text-xs">
                <summary class="cursor-pointer text-red-600 hover:text-red-800">Show code</summary>
                <pre class="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">${escapedCode}</pre>
              </details>
            </div>
          `
          mermaidDiv.setAttribute('data-rendered', 'error')
        }
      }
    }

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(renderMermaidDiagrams, 200)

    return () => {
      clearTimeout(timeoutId)
      // Cleanup event listeners
      const svgElements = containerRef.current?.querySelectorAll('.mermaid svg')
      svgElements?.forEach(svgElement => {
        const handler = (svgElement as any)._clickHandler
        if (handler) {
          svgElement.removeEventListener('click', handler)
          delete (svgElement as any)._clickHandler
        }
      })
    }
  }, [processedContent, mermaidModule, reattachHandlers])

  // 简化的自动缩放逻辑
  useEffect(() => {
    if (zoomedDiagram) {
      // 从SVG viewBox获取原始尺寸
      const parser = new DOMParser()
      const doc = parser.parseFromString(zoomedDiagram.svg, 'text/html')
      const svg = doc.querySelector('svg')

      if (svg) {
        const viewBox = svg.getAttribute('viewBox')
        if (viewBox) {
          const [, , width, height] = viewBox.split(/\s+|,/).map(Number)

          // 计算适合浏览器的缩放比例（留10%边距）
          const scaleX = (window.innerWidth * 0.9) / width
          const scaleY = (window.innerHeight * 0.9) / height
          const scale = Math.min(scaleX, scaleY, 2) // 最大2x

          setAutoScale(Math.max(scale, 0.3)) // 最小0.3x
          setScale(1)
          setPosition({ x: 0, y: 0 })
        }
      }
    }
  }, [zoomedDiagram])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && zoomedDiagram) {
        event.preventDefault()
        event.stopPropagation()
        setZoomedDiagram(null)
        setScale(1)
        setPosition({ x: 0, y: 0 })
        // Trigger re-attachment of click handlers
        setReattachHandlers(prev => prev + 1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [zoomedDiagram])

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.preventDefault()
      e.stopPropagation()
      const touch = e.touches[0]
      setIsDragging(true)
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
    }
  }, [position])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return
    const touch = e.touches[0]
    setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y })
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Mouse/touch event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.removeEventListener('touchmove', handleTouchMove)
        document.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  // Wheel handler for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY
    setScale(prev => {
      if (delta < 0) {
        // Zoom in
        return Math.min(prev * 1.15, 10)
      } else {
        // Zoom out
        return Math.max(prev * 0.85, 0.1)
      }
    })
  }, [])

  // Add wheel listener when zoom modal is open
  useEffect(() => {
    if (zoomedDiagram) {
      document.addEventListener('wheel', handleWheel, { passive: false })
      return () => document.removeEventListener('wheel', handleWheel)
    }
  }, [zoomedDiagram, handleWheel])

  const handleCloseModal = () => {
    setZoomedDiagram(null)
    setScale(1)
    setPosition({ x: 0, y: 0 })
    // Trigger re-attachment of click handlers
    setReattachHandlers(prev => prev + 1)
  }

  return (
    <>
      <style jsx>{`
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          font-weight: bold;
          color: #111827;
          margin-bottom: 1rem;
          margin-top: 1.5rem;
        }
        .markdown-content h1 { font-size: 2.25rem; }
        .markdown-content h2 { font-size: 1.875rem; }
        .markdown-content h3 { font-size: 1.5rem; }
        .markdown-content h4 { font-size: 1.25rem; }
        .markdown-content p {
          margin-bottom: 1rem;
          line-height: 1.625;
          color: #374151;
        }
        .markdown-content strong {
          font-weight: bold;
          color: #111827;
        }
        .markdown-content em {
          font-style: italic;
          color: #4B5563;
        }
        .markdown-content del {
          text-decoration: line-through;
          color: #6B7280;
        }
        .markdown-content a {
          color: #2563EB;
          text-decoration: underline;
        }
        .markdown-content a:hover {
          color: #1D4ED8;
        }
        .markdown-content blockquote {
          border-left: 4px solid #D1D5DB;
          padding-left: 1rem;
          font-style: italic;
          color: #4B5563;
          margin: 1rem 0;
        }
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .markdown-content li {
          margin-bottom: 0.25rem;
        }
        .markdown-content code {
          background-color: #F3F4F6;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
        }
        .markdown-content pre {
          background-color: #F3F4F6;
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1rem;
          max-width: 100%;
          word-wrap: break-word;
          -webkit-overflow-scrolling: touch;
        }
        .markdown-content pre code {
          background-color: transparent;
          padding: 0;
        }
        .markdown-content table {
          width: 100%;
          max-width: 100%;
          border-collapse: collapse;
          border: 1px solid #D1D5DB;
          margin: 1rem 0;
          table-layout: auto;
          word-wrap: break-word;
          display: block;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          white-space: nowrap;
        }

        .markdown-content table thead,
        .markdown-content table tbody,
        .markdown-content table tr {
          display: table;
          width: 100%;
          table-layout: auto;
        }

        .markdown-content table td,
        .markdown-content table th {
          border: 1px solid #D1D5DB;
          padding: 0.5rem 1rem;
          text-align: left;
          white-space: nowrap;
          min-width: 150px;
        }
        .markdown-content th {
          background-color: #F9FAFB;
          font-weight: 600;
          color: #111827;
        }
        .markdown-content tr:hover {
          background-color: #F9FAFB;
        }
        .markdown-content hr {
          border: none;
          border-top: 1px solid #D1D5DB;
          margin: 1.5rem 0;
        }
      `}</style>
      <div
        ref={containerRef}
        className={`prose prose-gray max-w-none markdown-content w-full ${className}`}
      >
        {!content || content.trim() === '' ? (
          <p className="text-gray-500 italic">No content available</p>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: processedContent }} />
        )}
      </div>

      {/* 简化的模态框 */}
      {zoomedDiagram && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={handleCloseModal}
        >
          {/* 关闭按钮 */}
          <button
            onClick={handleCloseModal}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-100 rounded-full shadow-lg cursor-pointer transition-colors"
            aria-label="Close diagram view"
          >
            <span className="text-xl text-gray-700">✕</span>
          </button>

          {/* 图表 - 居中，可拖拽缩放 */}
          <div
            className="mermaid zoomed-diagram"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale * autoScale})`,
              transformOrigin: 'center center',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: zoomedDiagram.svg }}
          />
        </div>
      )}
    </>
  )
}