'use client'

import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'
import { marked } from 'marked'
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
  const [mermaidModule, setMermaidModule] = useState<any>(null)
  const [mermaidInitialized, setMermaidInitialized] = useState(false)
  const [processedContent, setProcessedContent] = useState<string>('')
  const [zoomedDiagram, setZoomedDiagram] = useState<{ code: string; svg: string } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
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
              console.warn('ESM import failed, trying node_modules direct:', e2)

              try {
                // Strategy 3: Try direct module access
                const mermaidModule = await import('/node_modules/mermaid/dist/mermaid.esm.min.mjs')
                mermaid = mermaidModule.default || mermaidModule
              } catch (e3) {
                console.error('All import strategies failed:', e3)
                throw new Error('Could not import mermaid library')
              }
            }
          }

          if (mermaid && typeof mermaid.initialize === 'function') {
            setMermaidModule(mermaid)
            console.log('Mermaid loaded successfully:', typeof mermaid)

            // Support all theme values: 'light', 'dark', 'default', 'neutral', 'forest'
            const mermaidTheme = ['light', 'dark', 'default', 'neutral', 'forest'].includes(theme)
              ? theme
              : 'default'

            mermaid.initialize({
              startOnLoad: false,
              theme: mermaidTheme,
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
                svgElement.classList.add('w-full', 'h-auto', 'transition-transform', 'hover:scale-105')
                svgElement.setAttribute('data-click-handler-added', 'true')

                const handleDiagramClick = () => {
                  setZoomedDiagram({
                    code: originalText,
                    svg: savedSvg
                  })
                }

                svgElement.addEventListener('click', handleDiagramClick)
                ;(svgElement as any)._mermaidClickHandler = handleDiagramClick
              }

              // Store the rendered content on the element to prevent reset
              ;(element as any)._renderedSvg = savedSvg
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
              svgElement.classList.add('w-full', 'h-auto', 'transition-transform', 'hover:scale-105')
              svgElement.setAttribute('data-click-handler-added', 'true')

              const renderedSvg = element.innerHTML

              const handleDiagramClick = () => {
                setZoomedDiagram({
                  code: originalText,
                  svg: renderedSvg
                })
              }

              svgElement.addEventListener('click', handleDiagramClick)
              ;(svgElement as any)._mermaidClickHandler = handleDiagramClick
              ;(element as any)._renderedSvg = renderedSvg
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

            // Style the SVG and add click-to-zoom functionality
            if (svgElement) {
              svgElement.setAttribute('role', 'img')
              svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
              svgElement.setAttribute('title', 'Click to zoom diagram')
              svgElement.style.cursor = 'pointer'
              svgElement.classList.add('w-full', 'h-auto', 'transition-transform', 'hover:scale-105')

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
              ;(svgElement as any)._mermaidClickHandler = handleDiagramClick

              // Store the rendered content on the element to prevent reset
              ;(element as any)._renderedSvg = renderedSvg
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
                svgElement.classList.add('w-full', 'h-auto', 'transition-transform', 'hover:scale-105')

                // Use the svgContent directly as it's already the rendered content
                const handleDiagramClick = () => {
                  setZoomedDiagram({
                    code: originalText,
                    svg: svgContent // Use the rendered SVG content from mermaid.render()
                  })
                }

                svgElement.addEventListener('click', handleDiagramClick)
                ;(svgElement as any)._mermaidClickHandler = handleDiagramClick

                // Store the rendered content on the element to prevent reset
                ;(element as any)._renderedSvg = svgContent
              }
            } catch (renderError) {
              console.error('Both mermaid.run() and mermaid.render() failed:', renderError)
              throw renderError
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
              svgElement.classList.add('w-full', 'h-auto', 'transition-transform', 'hover:scale-105')
              svgElement.setAttribute('data-click-handler-added', 'true')

              // Re-add click handler
              const handleDiagramClick = () => {
                setZoomedDiagram({
                  code: originalText,
                  svg: backupContent
                })
              }
              svgElement.addEventListener('click', handleDiagramClick)
              ;(svgElement as any)._mermaidClickHandler = handleDiagramClick
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
      if (!marked || typeof marked !== 'function') {
        console.error('Marked library not available')
        setProcessedContent('<p>Markdown renderer not available</p>')
        return
      }

      let htmlContent: string

      // Check if we can create a Marked instance (not available in test environment)
      if (marked.Marked && typeof marked.Marked === 'function') {
        // Production: Create a new Marked instance to avoid state pollution between renders
        const markedInstance = new marked.Marked()
        
        // Configure custom renderer extensions for this instance
        markedInstance.use({
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
            heading({ tokens, depth }: { tokens?: any[]; depth?: number }): string {
              // Add null checks
              if (!tokens || !Array.isArray(tokens) || !depth) {
                return '<h1 class="heading-1 prose-headings">Missing heading</h1>'
              }
              const text = this.parser.parseInline(tokens)
              const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
              return `<h${depth} id="${id}" class="heading-${depth} prose-headings">${text}</h${depth}>`
            },
            paragraph({ tokens }: { tokens: any[] }): string {
              const text = this.parser.parseInline(tokens)
              return `<p class="prose-p">${text}</p>`
            },
            list({ tokens, ordered }: { tokens?: any[]; ordered?: boolean }): string {
              // Add null checks for tokens
              if (!tokens || !Array.isArray(tokens)) {
                return ordered ? '<ol class="prose-ol"></ol>' : '<ul class="prose-ul"></ul>'
              }

              const type = ordered ? 'ol' : 'ul'
              const className = ordered ? 'prose-ol' : 'prose-ul'
              const items = tokens.map(token => this.parser.parse([token]))
              return `<${type} class="${className}">${items.join('')}</${type}>`
            },
            listitem({ tokens }: { tokens?: any[] }): string {
              // Add null checks for tokens
              if (!tokens || !Array.isArray(tokens)) {
                return '<li class="prose-li"></li>'
              }
              const text = this.parser.parseInline(tokens)
              return `<li class="prose-li">${text}</li>`
            },
            blockquote({ tokens }: { tokens: any[] }): string {
              const text = this.parser.parse(tokens)
              return `<blockquote class="prose-blockquote">${text}</blockquote>`
            },
            codespan({ text }: { text: string }): string {
              return `<code class="prose-code">${text}</code>`
            },
            link({ href, title, tokens }: { href: string; title?: string; tokens: any[] }): string {
              const text = this.parser.parseInline(tokens)
              const titleAttr = title ? ` title="${title}"` : ''
              return `<a href="${href}" class="prose-a"${titleAttr} data-hover-styles>${text}</a>`
            },
            table({ header, rows }: { header: any[]; rows: any[][] }): string {
              const headerCells = header.map(cell => `<th class="prose-th">${this.parser.parseInline(cell.tokens)}</th>`).join('')
              const headerRow = `<thead><tr>${headerCells}</tr></thead>`
              const bodyRows = rows.map(row => {
                const cells = row.map(cell => `<td class="prose-td">${this.parser.parseInline(cell.tokens)}</td>`).join('')
                return `<tr>${cells}</tr>`
              }).join('')
              const body = `<tbody>${bodyRows}</tbody>`
              return `<table class="prose-table">${headerRow}${body}</table>`
            }
          }
        })

        // Parse markdown
        htmlContent = markedInstance.parse(content) as string
      } else {
        // Test environment fallback: Use global marked function with extensions
        marked.use({
          renderer: {
            code({ text, lang }: { text: string; lang?: string }): string {
              if (lang === 'mermaid') {
                // Return div with text content to be rendered by useEffect
                return `<div class="mermaid my-6">${text}</div>`
              }
              return `<pre class="prose-pre"><code class="prose-code">${text}</code></pre>`
            },
            heading({ tokens, depth }: { tokens?: any[]; depth?: number }): string {
              // Add null checks
              if (!tokens || !Array.isArray(tokens) || !depth) {
                return '<h1 class="heading-1 prose-headings">Missing heading</h1>'
              }
              const text = this.parser.parseInline(tokens)
              const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
              return `<h${depth} id="${id}" class="heading-${depth} prose-headings">${text}</h${depth}>`
            },
            paragraph({ tokens }: { tokens: any[] }): string {
              const text = this.parser.parseInline(tokens)
              return `<p class="prose-p">${text}</p>`
            },
            list({ tokens, ordered }: { tokens?: any[]; ordered?: boolean }): string {
              // Add null checks for tokens
              if (!tokens || !Array.isArray(tokens)) {
                return ordered ? '<ol class="prose-ol"></ol>' : '<ul class="prose-ul"></ul>'
              }

              const type = ordered ? 'ol' : 'ul'
              const className = ordered ? 'prose-ol' : 'prose-ul'
              const items = tokens.map(token => this.parser.parse([token]))
              return `<${type} class="${className}">${items.join('')}</${type}>`
            },
            listitem({ tokens }: { tokens?: any[] }): string {
              // Add null checks for tokens
              if (!tokens || !Array.isArray(tokens)) {
                return '<li class="prose-li"></li>'
              }
              const text = this.parser.parseInline(tokens)
              return `<li class="prose-li">${text}</li>`
            },
            blockquote({ tokens }: { tokens: any[] }): string {
              const text = this.parser.parse(tokens)
              return `<blockquote class="prose-blockquote">${text}</blockquote>`
            },
            codespan({ text }: { text: string }): string {
              return `<code class="prose-code">${text}</code>`
            },
            link({ href, title, tokens }: { href: string; title?: string; tokens: any[] }): string {
              const text = this.parser.parseInline(tokens)
              const titleAttr = title ? ` title="${title}"` : ''
              return `<a href="${href}" class="prose-a"${titleAttr} data-hover-styles>${text}</a>`
            },
            table({ header, rows }: { header: any[]; rows: any[][] }): string {
              const headerCells = header.map(cell => `<th class="prose-th">${this.parser.parseInline(cell.tokens)}</th>`).join('')
              const headerRow = `<thead><tr>${headerCells}</tr></thead>`
              const bodyRows = rows.map(row => {
                const cells = row.map(cell => `<td class="prose-td">${this.parser.parseInline(cell.tokens)}</td>`).join('')
                return `<tr>${cells}</tr>`
              }).join('')
              const body = `<tbody>${bodyRows}</tbody>`
              return `<table class="prose-table">${headerRow}${body}</table>`
            }
          }
        })
        htmlContent = marked(content) as string
      }

      // Process mermaid code blocks and replace with pre-rendered SVGs
      console.log('Markdown preprocessing check:', {
        hasMermaidModule: !!mermaidModule,
        hasHtmlContent: !!htmlContent,
        htmlContentLength: htmlContent?.length || 0
      })
      if (mermaidModule && htmlContent) {
        console.log('Starting markdown preprocessing for mermaid diagrams...')
        const mermaidMatches = htmlContent.match(/```mermaid\n([\s\S]*?)```/g)
        console.log('Found mermaid code blocks in markdown:', mermaidMatches?.length || 0)

        htmlContent = htmlContent.replace(/```mermaid\n([\s\S]*?)```/g, (match, mermaidCode) => {
          const diagramKey = mermaidCode.trim().substring(0, 50)

          console.log('Processing mermaid code block:', {
            diagramKey,
            codeLength: mermaidCode.length,
            alreadyProcessed: processedMermaid.has(diagramKey)
          })

          // If we already processed this diagram, use the cached SVG
          if (processedMermaid.has(diagramKey) && renderedDiagrams.has(diagramKey)) {
            const cachedSvg = renderedDiagrams.get(diagramKey)!
            console.log('Using cached SVG for diagram:', diagramKey)
            return `<div class="mermaid" data-mermaid-rendered="true">${cachedSvg}</div>`
          }

          // Process new mermaid diagram
          try {
            const uniqueId = `mermaid-diagram-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
            const { svg } = mermaidModule.render(uniqueId, mermaidCode.trim())

            console.log('Successfully rendered mermaid diagram:', {
              diagramKey,
              svgLength: svg.length
            })

            // Cache the rendered SVG
            setRenderedDiagrams(prev => new Map(prev.set(diagramKey, svg)))
            setProcessedMermaid(prev => new Set(prev.add(diagramKey)))

            // Return the SVG wrapped in a mermaid div
            return `<div class="mermaid" data-mermaid-rendered="true">${svg}</div>`
          } catch (error) {
            console.error('Failed to render mermaid diagram:', error)
            return `<div class="mermaid-error"><p>Failed to render diagram: ${error instanceof Error ? error.message : 'Unknown error'}</p></div>`
          }
        })
      }
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
          
          // Use the larger of target scale or fit scale, but cap appropriately
          scale = Math.max(scale, Math.min(fitScale, 2.5))
          
          // Apply reasonable bounds based on diagram size
          if (width < 300 && height < 300) {
            // Very small diagrams: allow up to 3x
            scale = Math.min(scale, 3)
          } else if (width > 3000 || height > 3000) {
            // Very large diagrams: minimum 0.2x
            scale = Math.max(scale, 0.2)
          } else {
            // Normal diagrams: 0.5x to 2.5x range
            scale = Math.max(Math.min(scale, 2.5), 0.5)
          }
          
          setAutoScale(scale)
          setZoomLevel(1)
          setPosition({ x: 0, y: 0 })
        }
      }
    } else {
      setAutoScale(1)
      setZoomLevel(1)
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
          // Scroll up - zoom in
          return Math.min(prev + zoomStep, 5) // Max 5x zoom
        } else {
          // Scroll down - zoom out
          return Math.max(prev - zoomStep, 0.25) // Min 0.25x zoom
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
    setZoomLevel(1)
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
        className={`prose prose-gray max-w-none markdown-content ${className}`}
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
            className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg cursor-pointer transition-colors"
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
            }}
            dangerouslySetInnerHTML={{ __html: zoomedDiagram.svg }}
          />
        </div>
      )}
    </>
  )
}