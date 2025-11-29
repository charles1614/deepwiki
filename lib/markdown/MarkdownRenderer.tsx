'use client'

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Helper function to escape HTML for safe display
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

interface MarkdownRendererProps {
  content: string | null
  theme?: 'default' | 'handwritten'
  className?: string
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
  const [zoomedDiagram, setZoomedDiagram] = useState<{ code: string; svg: string } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(4) // Set to 4x for maximum default view
  const [autoScale, setAutoScale] = useState(1)
  const [renderedDiagrams, setRenderedDiagrams] = useState<Map<string, string>>(new Map())
  const [processedMermaid, setProcessedMermaid] = useState<Set<string>>(new Set())
  const mermaidRenderedRef = useRef(false)

  // Drag and pan state
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const diagramContainerRef = useRef<HTMLDivElement>(null)

  // Dynamically import and initialize Mermaid on component mount
  useEffect(() => {
    const initMermaid = async () => {
      if (!mermaidInitialized) {
        try {
          // Try multiple import strategies for mermaid v11
          let mermaid = null

          try {
            // Strategy 1: Try default import
            const mermaidDynamic = await import('mermaid')
            mermaid = mermaidDynamic.default || mermaidDynamic
          } catch (e1) {
            console.warn('Default import failed, trying alternative import:', e1)

            try {
              // Strategy 2: Try specific ESM import
              const mermaidModule = await import('mermaid/dist/mermaid.esm.min.mjs')
              mermaid = mermaidModule.default || mermaidModule
            } catch (e2) {
              console.error('All import strategies failed:', e2)
              throw new Error('Could not import mermaid library')
            }
          }

          if (mermaid && typeof mermaid.initialize === 'function') {
            setMermaidModule(mermaid)
            console.log('Mermaid loaded successfully:', typeof mermaid)

            // Simple configuration with optional handwritten font
            const handwrittenFont = '"Comic Neue", "Comic Sans MS", "Kalam", "Gaegu", "Caveat", "Permanent Marker", cursive'
            const defaultFont = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

            mermaid.initialize({
              startOnLoad: false,
              securityLevel: 'loose',
              theme: 'default',
              suppressErrorRendering: true, // Suppress default error messages in the DOM
              fontFamily: theme === 'handwritten' ? handwrittenFont : defaultFont,
              fontSize: 14,
              flowchart: {
                useMaxWidth: true,
                htmlLabels: true,
                curve: 'basis',
                padding: 20,
                nodeSpacing: 45,
                rankSpacing: 55,
                wrappingWidth: 200,
                diagramPadding: 20
              },
              themeCSS: theme === 'handwritten' ? `
                .nodeLabel, .edgeLabel, .titleText {
                  font-weight: 700 !important;
                }
                .nodeLabel text, .edgeLabel text, .titleText text {
                  font-weight: 700 !important;
                }

                /* Apply dashed borders to nodes while keeping original fill colors */
                .node rect, .node circle, .node ellipse, .node polygon {
                  stroke: #666666 !important;
                  stroke-width: 2px !important;
                  stroke-dasharray: 5,3 !important;
                  /* Do not override fill - keep original colors */
                }

                /* Apply dashed borders to clusters and make them transparent */
                .cluster rect {
                  fill: transparent !important;
                  stroke: #666666 !important;
                  stroke-width: 2px !important;
                  stroke-dasharray: 8,4 !important;
                }

                /* Ensure edge labels have no background */
                .edgeLabel {
                  background: transparent !important;
                }
              ` : ''
            })

            setMermaidInitialized(true)
          } else {
            console.warn('Mermaid initialize function not available')
            setMermaidInitialized(true)
          }
        } catch (error) {
          console.warn('Failed to initialize mermaid:', error)
          setMermaidInitialized(true)
        }
      }
    }

    initMermaid()
  }, [theme, mermaidInitialized])


  // Process Mermaid diagrams after content is rendered
  useEffect(() => {
    if (!content || !containerRef.current || !mermaidInitialized || !processedContent) return

    // Skip if already rendered
    if (mermaidRenderedRef.current) return

    const processMermaidDiagrams = async () => {
      const mermaidElements = containerRef.current?.querySelectorAll('.mermaid')

      if (mermaidElements.length === 0) return

      // Mark as rendered
      mermaidRenderedRef.current = true

      for (const element of mermaidElements) {
        try {
          // Only process if mermaid is available
          console.log('Mermaid module check:', {
            hasModule: !!mermaidModule,
            moduleType: typeof mermaidModule,
            hasRun: mermaidModule && typeof mermaidModule.run === 'function',
            hasRender: mermaidModule && typeof mermaidModule.render === 'function',
            isInitialized: mermaidInitialized
          })

          if (!mermaidModule || typeof mermaidModule.run !== 'function') {
            console.warn('Mermaid library not available - skipping diagram rendering')
            continue
          }

          const code = element.textContent || ''
          if (!code.trim()) continue

          // Store the original text content
          const originalText = code.trim()
          const diagramKey = originalText.substring(0, 50) // Create a key for the diagram

          // First check if element is already rendered and protected
          if (element.hasAttribute('data-mermaid-rendered') || element.querySelector('svg')) {
            console.log('Element already rendered/protected, skipping re-render', {
              hasProtectionMarker: element.hasAttribute('data-mermaid-rendered'),
              hasSvg: !!element.querySelector('svg')
            })
            continue
          }

          // Check if we have a previously rendered SVG to restore
          if (renderedDiagrams.has(diagramKey)) {
            const savedSvg = renderedDiagrams.get(diagramKey)!
            console.log('Restoring saved SVG from state, length:', savedSvg.length)
            element.innerHTML = savedSvg

            const svgElement = element.querySelector('svg')
            if (svgElement) {
              if (!svgElement.hasAttribute('data-click-handler-added')) {
                svgElement.setAttribute('role', 'img')
                svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
                svgElement.setAttribute('title', 'Click to zoom diagram')
                svgElement.style.cursor = 'pointer'
                svgElement.classList.add('w-full', 'h-auto')
                svgElement.setAttribute('data-click-handler-added', 'true')

                const handleDiagramClick = () => {
                  setZoomedDiagram({
                    code: originalText,
                    svg: savedSvg
                  })
                }

                svgElement.addEventListener('click', handleDiagramClick)
                  ; (svgElement as any)._mermaidClickHandler = handleDiagramClick
              }

              // Store the rendered content on the element to prevent reset
              ; (element as any)._renderedSvg = savedSvg
              console.log('SVG restored successfully with click handlers')
            }
            continue
          }

          // Check if element is already rendered with pre-rendered SVG (from markdown preprocessing)
          if (element.hasAttribute('data-mermaid-rendered') && element.querySelector('svg')) {
            // Element was pre-rendered during markdown processing, just add click handler if missing
            const svgElement = element.querySelector('svg')
            if (svgElement && !svgElement.hasAttribute('data-click-handler-added')) {
              svgElement.setAttribute('role', 'img')
              svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
              svgElement.setAttribute('title', 'Click to zoom diagram')
              svgElement.style.cursor = 'pointer'
              svgElement.classList.add('w-full', 'h-auto')
              svgElement.setAttribute('data-click-handler-added', 'true')

              const renderedSvg = element.innerHTML

              const handleDiagramClick = () => {
                setZoomedDiagram({
                  code: originalText,
                  svg: renderedSvg
                })
              }

              svgElement.addEventListener('click', handleDiagramClick)
                ; (svgElement as any)._mermaidClickHandler = handleDiagramClick
                ; (element as any)._renderedSvg = renderedSvg
            }
            continue // Skip re-rendering
          }

          // Clear any existing content to prevent duplicate rendering
          element.innerHTML = ''
          element.classList.add('mermaid')

          // Try to render using mermaid.render (more reliable for v11)
          try {
            console.log('Attempting mermaid.render with diagram code:', {
              codeLength: originalText.length,
              codePreview: originalText.substring(0, 100)
            })

            // Generate unique ID for this diagram
            const uniqueId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

            // Use mermaid.render which is more stable in v11
            const { svg } = await mermaidModule.render(uniqueId, originalText)

            console.log('Mermaid.render succeeded, SVG length:', svg.length)

            // Insert the SVG into the element
            element.innerHTML = svg

            // Add protection marker to prevent markdown processing from overwriting
            element.setAttribute('data-mermaid-rendered', 'true')

            // Store original text for DOM protection system
            element.setAttribute('data-original-text', originalText)

            // Verify the SVG was inserted
            const svgElement = element.querySelector('svg')
            console.log('SVG insertion verification:', {
              hasSvg: !!svgElement,
              elementInnerHTMLLength: element.innerHTML.length,
              svgElementExists: !!svgElement,
              hasProtectionMarker: element.hasAttribute('data-mermaid-rendered')
            })

            // Style the SVG with enhanced academic and professional themes
            if (svgElement) {
              svgElement.setAttribute('role', 'img')
              svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
              svgElement.setAttribute('title', 'Click to zoom diagram')
              svgElement.style.cursor = 'pointer'

              // Simple default styling
              svgElement.classList.add(
                'w-full',
                'h-auto'
              )

              // Basic styling
              svgElement.style.cursor = 'pointer'

              // Ensure text elements are on top layer
              const textElements = svgElement.querySelectorAll('text')
              textElements.forEach(textEl => {
                textEl.style.zIndex = '100'
                textEl.style.position = 'relative'
              })

              // Ensure all g elements containing text are on top
              const gElements = svgElement.querySelectorAll('g')
              gElements.forEach(gEl => {
                const hasText = gEl.querySelector('text')
                if (hasText) {
                  gEl.style.zIndex = '50'
                  gEl.style.position = 'relative'
                }
              })

              // Capture the rendered SVG immediately to prevent loss
              const renderedSvg = element.innerHTML

              // Add click handler for zoom functionality
              const handleDiagramClick = () => {
                setZoomedDiagram({
                  code: originalText,
                  svg: renderedSvg // Use the captured SVG content
                })
              }

              svgElement.addEventListener('click', handleDiagramClick)
                // Store click handler reference for cleanup
                ; (svgElement as any)._mermaidClickHandler = handleDiagramClick

                // Store the rendered content on the element to prevent reset
                ; (element as any)._renderedSvg = renderedSvg
            }
          } catch (runError) {
            // If mermaid.run() fails, try mermaid.render() as fallback
            console.warn('Mermaid.run() failed, trying render() fallback:', runError)

            try {
              // Generate unique ID for render method
              const uniqueId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
              const { svg: svgContent } = await mermaidModule.render(uniqueId, originalText)
              element.innerHTML = svgContent

              const svgElement = element.querySelector('svg')
              if (svgElement) {
                svgElement.setAttribute('role', 'img')
                svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
                svgElement.setAttribute('title', 'Click to zoom diagram')
                svgElement.style.cursor = 'pointer'

                // Basic styling for fallback
                svgElement.classList.add(
                  'w-full',
                  'h-auto'
                )

                svgElement.style.cursor = 'pointer'

                // Ensure text elements are on top layer for fallback
                const textElements = svgElement.querySelectorAll('text')
                textElements.forEach(textEl => {
                  textEl.style.zIndex = '100'
                  textEl.style.position = 'relative'
                })

                // Ensure all g elements containing text are on top
                const gElements = svgElement.querySelectorAll('g')
                gElements.forEach(gEl => {
                  const hasText = gEl.querySelector('text')
                  if (hasText) {
                    gEl.style.zIndex = '50'
                    gEl.style.position = 'relative'
                  }
                })

                // Use the svgContent directly as it's already the rendered content
                const handleDiagramClick = () => {
                  setZoomedDiagram({
                    code: originalText,
                    svg: svgContent // Use the rendered SVG content from mermaid.render()
                  })
                }

                svgElement.addEventListener('click', handleDiagramClick)
                  ; (svgElement as any)._mermaidClickHandler = handleDiagramClick

                  // Store the rendered content on the element to prevent reset
                  ; (element as any)._renderedSvg = svgContent
              }
            } catch (renderError) {
              console.error('Both mermaid.run() and mermaid.render() failed:', renderError)
              throw renderError
            }
          }
        } catch (error) {
          console.error('Mermaid rendering error:', error)

          // Extract error message and details
          let errorMessage = 'Unknown error'
          let errorDetails = ''

          if (error instanceof Error) {
            errorMessage = error.message

            // Extract line number if available (e.g., "Parse error on line 3:")
            const lineMatch = errorMessage.match(/line (\d+)/i)
            const lineNumber = lineMatch ? lineMatch[1] : null

            // Extract the problematic code snippet if available
            const codeMatch = errorMessage.match(/\.\.\.\s+(.+?)\s+[\^\-]+/)
            const problemCode = codeMatch ? codeMatch[1].trim() : null

            // Build detailed error message
            if (lineNumber) {
              errorDetails = `Error on line ${lineNumber}`
              if (problemCode) {
                errorDetails += `: "${problemCode}"`
              }
            } else {
              errorDetails = errorMessage
            }
          } else if (typeof error === 'string') {
            errorMessage = error
            errorDetails = error
          }

          // Show error message in the diagram area
          element.innerHTML = `
            <div class="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <p class="font-semibold text-red-800">Diagram rendering failed</p>
              <p class="text-sm text-red-600 mt-1">Mermaid syntax error detected. Please check your diagram code.</p>
              ${errorDetails ? `
              <details class="mt-2">
                <summary class="text-xs text-red-500 cursor-pointer hover:text-red-700">Show error details</summary>
                <div class="mt-2 text-xs text-red-600">
                  <p class="font-mono bg-red-100 p-2 rounded border border-red-300 whitespace-pre-wrap">${escapeHtml(errorDetails)}</p>
                  <p class="mt-2 text-red-500">Common issues:</p>
                  <ul class="list-disc list-inside ml-2 mt-1 space-y-1">
                    <li>Check for unclosed brackets or quotes in node labels</li>
                    <li>Ensure proper syntax for node definitions (e.g., A["Label"] not A[Label: "Text"])</li>
                    <li>Verify all connections use correct arrow syntax (-->, ---, etc.)</li>
                  </ul>
                </div>
              </details>
              ` : ''}
            </div>
          `
        }
      }
    }

    processMermaidDiagrams()

    // Cleanup function to remove event listeners
    return () => {
      const svgElements = containerRef.current?.querySelectorAll('.mermaid svg')
      svgElements?.forEach(svgElement => {
        const handler = (svgElement as any)._mermaidClickHandler
        if (handler) {
          svgElement.removeEventListener('click', handler)
          delete (svgElement as any)._mermaidClickHandler
        }
      })
    }
  }, [content, mermaidInitialized, processedContent])

  // DOM protection system to prevent React from overwriting SVG content
  useEffect(() => {
    if (!containerRef.current) return

    // Store original SVG content to restore if overwritten
    const svgBackup = new Map<string, string>()

    // Function to backup SVG content
    const backupSvgContent = () => {
      const mermaidElements = containerRef.current?.querySelectorAll('.mermaid[data-mermaid-rendered="true"]')
      mermaidElements?.forEach(element => {
        const elementId = element.getAttribute('data-diagram-id') || `backup-${Date.now()}-${Math.random()}`
        element.setAttribute('data-diagram-id', elementId)

        const svgContent = element.innerHTML
        if (svgContent && svgContent.includes('<svg')) {
          svgBackup.set(elementId, svgContent)
        }
      })
    }

    // Function to restore SVG content if it gets overwritten
    const restoreSvgContent = () => {
      const mermaidElements = containerRef.current?.querySelectorAll('.mermaid[data-mermaid-rendered="true"]')
      mermaidElements?.forEach(element => {
        const elementId = element.getAttribute('data-diagram-id')
        if (elementId && svgBackup.has(elementId)) {
          const currentContent = element.innerHTML
          const backupContent = svgBackup.get(elementId)!

          // Check if current content has been overwritten (no SVG)
          if (!currentContent.includes('<svg') && currentContent !== backupContent) {
            console.log('Restoring overwritten SVG content for element:', elementId)
            element.innerHTML = backupContent

            // Re-add click handlers after restoration
            const svgElement = element.querySelector('svg')
            if (svgElement && !svgElement.hasAttribute('data-click-handler-added')) {
              const originalText = element.getAttribute('data-original-text') || 'Mermaid diagram'
              svgElement.setAttribute('role', 'img')
              svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
              svgElement.setAttribute('title', 'Click to zoom diagram')
              svgElement.style.cursor = 'pointer'
              svgElement.classList.add('w-full', 'h-auto')
              svgElement.setAttribute('data-click-handler-added', 'true')

              // Re-add click handler
              const handleDiagramClick = () => {
                setZoomedDiagram({
                  code: originalText,
                  svg: backupContent
                })
              }

              svgElement.addEventListener('click', handleDiagramClick)
                ; (svgElement as any)._mermaidClickHandler = handleDiagramClick
            }
          }
        }
      })
    }

    // Set up MutationObserver to detect DOM changes
    const mutationObserver = new MutationObserver((mutations) => {
      let shouldRestore = false

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              if (element.classList?.contains('mermaid') || element.querySelector?.('.mermaid')) {
                shouldRestore = true
              }
            }
          })
        } else if (mutation.type === 'characterData') {
          const target = mutation.target as Element
          const parentElement = target.parentElement
          if (parentElement?.classList?.contains('mermaid')) {
            shouldRestore = true
          }
        }
      })

      if (shouldRestore) {
        setTimeout(restoreSvgContent, 10) // Small delay to ensure React has finished updating
      }
    })

    // Start observing the container
    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      characterData: true
    })

    // Initial backup and restore
    const initialBackupInterval = setInterval(() => {
      backupSvgContent()
      restoreSvgContent()
    }, 100)

    // Clean up after initial setup
    setTimeout(() => {
      clearInterval(initialBackupInterval)
    }, 2000)

    // Set up periodic backup and restore (less frequent)
    const maintenanceInterval = setInterval(() => {
      backupSvgContent()
      restoreSvgContent()
    }, 1000)

    return () => {
      mutationObserver.disconnect()
      clearInterval(maintenanceInterval)
    }
  }, [processedContent])

  // Process markdown content
  useEffect(() => {
    if (!content) {
      setProcessedContent('')
      mermaidRenderedRef.current = false
      return
    }

    // Reset rendered flag when content changes
    mermaidRenderedRef.current = false

    // Wait for mermaid to initialize before processing markdown
    if (!mermaidInitialized) {
      console.log('Waiting for mermaid to initialize before processing markdown...')
      return
    }

    try {
      // Check if marked exists and is properly configured
      if (!marked || typeof marked.parse !== 'function') {
        console.error('Marked library not available')
        setProcessedContent('<p>Markdown renderer not available</p>')
        return
      }

      let htmlContent: string

      // Configure marked v16 with custom renderer (minimal customization)
      marked.use({
        renderer: {
          code({ text, lang }: { text: string; lang?: string }): string {
            if (lang === 'mermaid') {
              // Return div with text content to be rendered by useEffect
              // We cannot pre-render here because mermaid.render() is async
              return `<div class="mermaid my-6">${text}</div>`
            }
            // For other code blocks, use default rendering with a custom wrapper
            return `<pre class="prose-pre"><code class="prose-code">${text}</code></pre>`
          },
          heading({ text, depth }: { text: string; depth: number }): string {
            if (!text || !depth) {
              return '<h1 class="heading-1 prose-headings">Missing heading</h1>'
            }
            const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
            return `<h${depth} id="${id}" class="heading-${depth} prose-headings">${text}</h${depth}>`
          }
          // Let marked use its default renderers for everything else (paragraph, list, etc.)
          // This ensures inline formatting (**bold**, *italic*, etc.) works correctly
        }
      })

      // Parse markdown using marked v16 API
      htmlContent = marked.parse(content) as string

      // Process mermaid code blocks and replace with pre-rendered SVGs
      console.log('Markdown preprocessing check:', {
        hasMermaidModule: !!mermaidModule,
        hasHtmlContent: !!htmlContent,
        htmlContentLength: htmlContent?.length || 0
      })

      if (containerRef.current && typeof window !== 'undefined') {
        const renderedMermaidElements = containerRef.current.querySelectorAll('.mermaid[data-mermaid-rendered="true"]')
        renderedMermaidElements.forEach((element) => {
          const svgContent = element.innerHTML
          const tempId = `temp-mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`

          // Create temporary placeholder
          const placeholder = `<div id="${tempId}" class="mermaid-placeholder" data-svg-content="${encodeURIComponent(svgContent)}"></div>`

          // Replace the mermaid element in htmlContent with placeholder
          const mermaidHtml = element.outerHTML
          if (htmlContent.includes(mermaidHtml)) {
            htmlContent = htmlContent.replace(mermaidHtml, placeholder)
            console.log('Protected rendered mermaid diagram with placeholder')
          }
        })
      }

      // Sanitize HTML content with enhanced allowed tags (only in browser)
      let sanitizedContent = htmlContent

      // DOMPurify only works in browser environment
      if (typeof window !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function') {
        sanitizedContent = DOMPurify.sanitize(htmlContent, {
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
      }

      // Remove empty paragraphs (from blank lines in markdown)
      // This removes <p> tags that are empty or contain only whitespace
      sanitizedContent = sanitizedContent.replace(/<p[^>]*>\s*<\/p>/gi, '')

      setProcessedContent(sanitizedContent)

      // Restore protected SVG content after DOM update
      setTimeout(() => {
        if (containerRef.current) {
          const placeholders = containerRef.current.querySelectorAll('.mermaid-placeholder')
          placeholders.forEach((placeholder) => {
            const svgContent = decodeURIComponent(placeholder.getAttribute('data-svg-content') || '')
            placeholder.innerHTML = svgContent
            placeholder.removeAttribute('data-svg-content')
            placeholder.classList.remove('mermaid-placeholder')
            placeholder.classList.add('mermaid')
            placeholder.setAttribute('data-mermaid-rendered', 'true')
            console.log('Restored protected SVG content')
          })
        }
      }, 0)
    } catch (error) {
      console.error('Failed to process markdown:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      setProcessedContent('<p>Error rendering markdown</p>')
    }
  }, [content, mermaidInitialized])

  // Handle keyboard shortcuts for zoom modal (ESC to close)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!zoomedDiagram) return

      if (event.key === 'Escape') {
        handleModalClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [zoomedDiagram])

  // Auto-scale diagram to fit browser viewport with adaptive resolution
  useEffect(() => {
    if (zoomedDiagram) {
      // Parse SVG to get viewBox dimensions
      const parser = new DOMParser()
      const doc = parser.parseFromString(zoomedDiagram.svg, 'text/html')
      const svg = doc.querySelector('svg')

      if (svg) {
        const viewBox = svg.getAttribute('viewBox')
        if (viewBox) {
          const [, , width, height] = viewBox.split(/\s+|,/).map(Number)

          // Get actual viewport dimensions
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight

          // Target: Fill 80-85% of viewport for optimal visibility
          // Use minimal padding to maximize diagram size
          const targetFillRatio = 0.82
          const paddingRatio = 0.04 // 4% padding on each side

          // Calculate scale to fill target percentage of viewport
          const targetWidth = viewportWidth * targetFillRatio
          const targetHeight = viewportHeight * targetFillRatio

          // Calculate required scale for both dimensions
          const scaleForWidth = targetWidth / width
          const scaleForHeight = targetHeight / height

          // Use the smaller scale to ensure diagram fits completely
          let scale = Math.min(scaleForWidth, scaleForHeight)

          // Also calculate scale to fit with padding (fallback for very large diagrams)
          const maxFitWidth = viewportWidth * (1 - paddingRatio * 2)
          const maxFitHeight = viewportHeight * (1 - paddingRatio * 2)
          const fitScale = Math.min(maxFitWidth / width, maxFitHeight / height)

          // Use the larger of target scale or fit scale (no artificial limits)
          scale = Math.max(scale, fitScale)

          // No artificial size constraints - allow any scale that makes sense for the content

          setAutoScale(scale)
          setPosition({ x: 0, y: 0 })
        }
      }
    } else {
      setAutoScale(1)
      // Don't reset zoomLevel to 1, keep the default value (5)
      setZoomLevel(4)
      setPosition({ x: 0, y: 0 })
    }
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

    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setPosition({ x: newX, y: newY })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for mobile
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
    const newX = touch.clientX - dragStart.x
    const newY = touch.clientY - dragStart.y
    setPosition({ x: newX, y: newY })
  }, [isDragging, dragStart])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add mouse and touch event listeners for dragging
  useEffect(() => {
    if (!zoomedDiagram) return

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
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, zoomedDiagram])

  // Wheel event listener for zooming with touchpad/mouse wheel
  useEffect(() => {
    if (!zoomedDiagram || !diagramContainerRef.current) return

    const container = diagramContainerRef.current
    const handleWheel = (event: WheelEvent) => {
      // Only zoom when hovering over the diagram container or its children
      const target = event.target as Node
      if (!container.contains(target)) return

      event.preventDefault()
      event.stopPropagation()

      // Determine zoom direction based on wheel delta
      const delta = event.deltaY
      const zoomStep = 0.1 // Smoother zoom steps for wheel

      setZoomLevel(prev => {
        if (delta < 0) {
          // Scroll up - zoom in (no upper limit)
          return prev + zoomStep
        } else {
          // Scroll down - zoom out (minimum 0.1x)
          return Math.max(prev - zoomStep, 0.1)
        }
      })
    }

    // Add event listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [zoomedDiagram])

  const handleModalClose = () => {
    setZoomedDiagram(null)
    // Reset to default zoom level (4x)
    setZoomLevel(4)
    setPosition({ x: 0, y: 0 })
  }

  const finalContent = processedContent

  // Use useLayoutEffect to render HTML before browser paint, like VS Code's layout system
  useLayoutEffect(() => {
    if (!containerRef.current || !finalContent) return

    // Direct DOM manipulation to avoid React re-render, similar to VS Code's ISerializableView pattern
    const contentDiv = containerRef.current.querySelector('[data-markdown-content]')
    if (contentDiv) {
      contentDiv.innerHTML = finalContent
    }
  }, [finalContent])

  return (
    <>
      {/* Aria-live region for accessibility announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="mermaid-status"
      />
      <div
        ref={containerRef}
        data-testid="markdown-content"
        className={`prose prose-sm prose-gray max-w-none markdown-content ${className}`}
      >
        {!content || content.trim() === '' ? (
          <div>
            <p className="text-gray-500 italic">No content available</p>
          </div>
        ) : (
          <div data-markdown-content suppressHydrationWarning />
        )}
      </div>

      {/* Mermaid Zoom Modal - Simple Full-Screen Viewer */}
      {zoomedDiagram && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={handleModalClose}
        >
          {/* Close button */}
          <button
            onClick={handleModalClose}
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white cursor-pointer transition-colors"
            aria-label="Close"
          >
            <span className="text-xl text-gray-700">✕</span>
          </button>

          {/* Diagram - center, draggable, zoomable */}
          <div
            ref={diagramContainerRef}
            className="mermaid zoomed-diagram"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onClick={(e) => e.stopPropagation()}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel * autoScale})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              willChange: isDragging ? 'transform' : 'auto',
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: 'none',
              borderRadius: '0px',
              overflow: 'visible',
            }}
            dangerouslySetInnerHTML={{ __html: zoomedDiagram.svg }}
          />
        </div>
      )}
    </>
  )
}