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
          code({ text, lang }: { text: string; lang?: string }): string {
            if (lang === 'mermaid') {
              return `<div class="mermaid-wrapper" data-mermaid-code="${encodeURIComponent(text)}"><div class="mermaid">${text}</div></div>`
            }
            return `<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto"><code class="text-sm font-mono">${text}</code></pre>`
          },

          heading({ text, depth }: { text: string; depth: number }): string {
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return `<h${depth} id="${id}" class="font-bold text-gray-900 mb-4 mt-6 first:mt-0 text-${4-depth === 1 ?4-depth:4-depth}xl">${text}</h${depth}>`
          },

          paragraph({ text }: { text: string }): string {
            return `<p class="mb-4 text-gray-700 leading-relaxed">${text}</p>`
          },

          list({ children, ordered }: { children: string; ordered?: boolean }): string {
            const type = ordered ? 'ol' : 'ul'
            const className = ordered ? 'list-decimal mb-4 pl-6' : 'list-disc mb-4 pl-6'
            return `<${type} class="${className}">${children}</${type}>`
          },

          listitem({ text }: { text: string }): string {
            return `<li class="mb-1">${text}</li>`
          },

          blockquote({ text }: { text: string }): string {
            return `<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4">${text}</blockquote>`
          },

          codespan({ text }: { text: string }): string {
            return `<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">${text}</code>`
          },

          link({ href, title, text }: { href: string; title?: string; text: string }): string {
            const titleAttr = title ? ` title="${title}"` : ''
            return `<a href="${href}" class="text-blue-600 hover:text-blue-800 underline"${titleAttr}>${text}</a>`
          },

          table({ text }: { text: string }): string {
            return `<table class="w-full border-collapse border border-gray-300 my-4">${text}</table>`
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
          console.log('Rendering mermaid diagram with code:', code.substring(0, 100) + '...')
          const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
          const { svg } = await mermaidModule.render(uniqueId, code)

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
              setZoomedDiagram({ code, svg })
              setScale(1)
              setPosition({ x: 0, y: 0 })
            }

            newSvgElement.addEventListener('click', handleClick)
            ;(newSvgElement as any)._clickHandler = handleClick
          }
        } catch (error) {
          console.error('Failed to render mermaid diagram:', error)
          mermaidDiv.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p class="font-semibold">Diagram rendering failed</p>
              <p class="text-sm mt-1">Check the mermaid syntax in your markdown code block.</p>
              <p class="text-xs mt-1">Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
            </div>
          `
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
      <div
        ref={containerRef}
        className={`prose prose-gray max-w-none ${className}`}
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