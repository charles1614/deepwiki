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
  theme?: 'light' | 'dark' | 'default' | 'neutral' | 'forest' | 'academic' | 'elegant' | 'professional' | 'minimal' | 'handdrawn'
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

            // Enhanced theme support with academic and professional themes
            const getMermaidConfig = (theme: string) => {
              const baseConfig = {
                startOnLoad: false,
                securityLevel: 'loose',
                fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                fontSize: 14,
                flowchart: {
                  useMaxWidth: true,
                  htmlLabels: true,
                  curve: 'basis',
                  padding: 25,
                  nodeSpacing: 50,
                  rankSpacing: 60,
                  wrappingWidth: 200,
                  diagramPadding: 25
                },
                themeVariables: {
                  primaryColor: '#003f5c',
                  primaryTextColor: '#fff',
                  primaryBorderColor: '#585e6a',
                  lineColor: '#585e6a',
                  secondaryColor: '#ffa600',
                  tertiaryColor: '#bc5090'
                }
              }

              // Academic theme - sophisticated university style
              if (theme === 'academic') {
                return {
                  ...baseConfig,
                  theme: 'dark',
                  themeVariables: {
                    primaryColor: '#1e3a8a',
                    primaryTextColor: '#ffffff',
                    primaryBorderColor: '#3730a3',
                    secondaryColor: '#7c3aed',
                    tertiaryColor: '#a78bfa',
                    lineColor: '#6b7280',
                    sectionBkgColor: '#1e293b',
                    altSectionBkgColor: '#334155',
                    gridColor: '#475569',
                    titleColor: '#f1f5f9',
                    edgeLabelBackground: '#1e293b',
                    clusterBkg: '#0f172a',
                    clusterBorder: '#334155'
                  },
                  flowchart: {
                    ...baseConfig.flowchart,
                    curve: 'cardinal',
                    padding: 25,
                    nodeSpacing: 60,
                    rankSpacing: 70
                  }
                }
              }

              // Elegant theme - modern and refined
              if (theme === 'elegant') {
                return {
                  ...baseConfig,
                  theme: 'dark',
                  themeVariables: {
                    primaryColor: '#0f172a',
                    primaryTextColor: '#f1f5f9',
                    primaryBorderColor: '#334155',
                    secondaryColor: '#0891b2',
                    tertiaryColor: '#06b6d4',
                    lineColor: '#64748b',
                    sectionBkgColor: '#1e293b',
                    altSectionBkgColor: '#334155',
                    gridColor: '#475569',
                    titleColor: '#f1f5f9',
                    edgeLabelBackground: '#1e293b',
                    clusterBkg: '#0f172a',
                    clusterBorder: '#334155'
                  },
                  flowchart: {
                    ...baseConfig.flowchart,
                    curve: 'basis',
                    padding: 25,
                    nodeSpacing: 60,
                    rankSpacing: 70
                  }
                }
              }

              // Professional theme - corporate and clean
              if (theme === 'professional') {
                return {
                  ...baseConfig,
                  theme: 'light',
                  themeVariables: {
                    primaryColor: '#0f172a',
                    primaryTextColor: '#f1f5f9',
                    primaryBorderColor: '#334155',
                    secondaryColor: '#0ea5e9',
                    tertiaryColor: '#0284c7',
                    lineColor: '#64748b',
                    sectionBkgColor: '#f8fafc',
                    altSectionBkgColor: '#f1f5f9',
                    gridColor: '#e2e8f0',
                    titleColor: '#0f172a',
                    edgeLabelBackground: '#ffffff',
                    clusterBkg: '#f8fafc',
                    clusterBorder: '#e2e8f0'
                  },
                  flowchart: {
                    ...baseConfig.flowchart,
                    curve: 'step',
                    padding: 25,
                    nodeSpacing: 60,
                    rankSpacing: 70
                  }
                }
              }

              // Minimal theme - clean and simple
              if (theme === 'minimal') {
                return {
                  ...baseConfig,
                  theme: 'light',
                  themeVariables: {
                    primaryColor: '#ffffff',
                    primaryTextColor: '#000000',
                    primaryBorderColor: '#e5e7eb',
                    secondaryColor: '#f3f4f6',
                    tertiaryColor: '#9ca3af',
                    lineColor: '#d1d5db',
                    sectionBkgColor: '#ffffff',
                    altSectionBkgColor: '#f9fafb',
                    gridColor: '#f3f4f6',
                    titleColor: '#000000',
                    edgeLabelBackground: '#ffffff',
                    clusterBkg: '#ffffff',
                    clusterBorder: '#e5e7eb'
                  },
                  flowchart: {
                    ...baseConfig.flowchart,
                    curve: 'linear',
                    padding: 20,
                    nodeSpacing: 55,
                    rankSpacing: 65
                  }
                }
              }

              // Handdrawn theme - sketchy and playful
              if (theme === 'handdrawn') {
                return {
                  ...baseConfig,
                  theme: 'default',
                  themeVariables: {
                    primaryColor: '#e5e7eb',
                    primaryTextColor: '#374151',
                    primaryBorderColor: '#6b7280',
                    secondaryColor: '#9ca3af',
                    tertiaryColor: '#6b7280',
                    lineColor: '#9ca3af',
                    sectionBkgColor: '#f3f4f6',
                    altSectionBkgColor: '#e5e7eb',
                    gridColor: '#d1d5db',
                    titleColor: '#374151',
                    edgeLabelBackground: '#f9fafb',
                    clusterBkg: '#fafafa',
                    clusterBorder: '#9ca3af'
                  },
                  flowchart: {
                    ...baseConfig.flowchart,
                    curve: 'cardinal',
                    padding: 30,
                    nodeSpacing: 70,
                    rankSpacing: 85,
                    htmlLabels: true,
                    useMaxWidth: true
                  },
                  // Add rough/rough-like appearance with larger fonts and diagonal stripes
                  themeCSS: `
                    .node rect, .node circle, .node ellipse, .node polygon {
                      stroke-dasharray: 3,2;
                      stroke-linecap: round;
                      fill-opacity: 0.85;
                    }

                    /* Add diagonal stripes to gray nodes (secondary/tertiary colors) */
                    .node rect[style*="fill:#9ca3af"],
                    .node circle[style*="fill:#9ca3af"],
                    .node ellipse[style*="fill:#9ca3af"],
                    .node polygon[style*="fill:#9ca3af"],
                    .node rect[style*="fill:#6b7280"],
                    .node circle[style*="fill:#6b7280"],
                    .node ellipse[style*="fill:#6b7280"],
                    .node polygon[style*="fill:#6b7280"] {
                      position: relative;
                      background-image: repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 4px,
                        rgba(255,255,255,0.4) 4px,
                        rgba(255,255,255,0.4) 8px
                      );
                    }

                    .edgePath path {
                      stroke-dasharray: 5,3;
                      stroke-linecap: round;
                      stroke-linejoin: round;
                      stroke-width: 3;
                      opacity: 0.7;
                    }

                    .edgeLabel {
                      font-family: 'Comic Sans MS', 'Marker Felt', cursive;
                      font-size: 1.2em;
                      font-weight: 600;
                      white-space: nowrap;
                      text-overflow: ellipsis;
                      overflow: hidden;
                    }

                    .nodeLabel {
                      font-family: 'Comic Sans MS', 'Marker Felt', cursive;
                      font-size: 1.3em;
                      font-weight: 600;
                      white-space: nowrap;
                      text-overflow: ellipsis;
                      overflow: hidden;
                    }

                    .cluster rect {
                      stroke-dasharray: 7,4;
                      stroke-width: 2.5;
                      fill-opacity: 0.6;
                    }

                    /* Increase spacing between clusters/subgraphs and nodes */
                    .cluster {
                      margin: 20px 0;
                    }

                    /* Ensure proper spacing between subgraph and internal nodes */
                    .cluster .node {
                      margin: 10px;
                    }

                    /* Add extra padding inside clusters */
                    .cluster g {
                      padding: 15px;
                    }

                    .titleText {
                      font-family: 'Comic Sans MS', 'Marker Felt', cursive;
                      font-size: 1.5em;
                      font-weight: 700;
                      margin-top: 25px;
                      margin-bottom: 10px;
                      display: block;
                    }

                    /* Add buffer zone above cluster titles to prevent arrow overlap */
                    .cluster {
                      margin-top: 45px;
                    }

                    /* Add spacing for standalone text labels above subgraphs */
                    g:has(> text:not(.nodeLabel):not(.edgeLabel):not(.titleText)):not(.cluster):not(.node) {
                      margin-bottom: 25px;
                      padding-bottom: 10px;
                    }

                    /* Ensure clusters have extra top margin when preceded by standalone text */
                    g:has(> text:not(.nodeLabel):not(.edgeLabel):not(.titleText)) + .cluster {
                      margin-top: 45px;
                    }

                    /* Make borders more sketchy and ensure proper sizing */
                    .node rect, .node circle, .node ellipse, .node polygon {
                      stroke-width: 2.5;
                      stroke-linecap: round;
                      stroke-dasharray: 5,3;
                      transform: rotate(-0.8deg);
                    }

                    /* Ensure nodes have minimum size to accommodate text */
                    .node rect {
                      min-width: 80px;
                      min-height: 40px;
                    }

                    .node circle, .node ellipse {
                      min-width: 60px;
                      min-height: 60px;
                    }

                    /* Make sure text containers are properly sized and on top */
                    .nodeLabel, .edgeLabel, .titleText {
                      display: block;
                      text-align: center;
                      padding: 2px 4px;
                      position: relative;
                      z-index: 10;
                    }

                    /* Ensure all text elements are on top layer */
                    .nodeLabel text, .edgeLabel text, .titleText text {
                      position: relative;
                      z-index: 15;
                    }

                    /* Make sure the main SVG text elements are on top */
                    svg g text {
                      position: relative;
                      z-index: 20;
                    }
                  `
                }
              }

              // Enhanced default themes
              if (theme === 'forest') {
                return {
                  ...baseConfig,
                  theme: 'forest',
                  flowchart: {
                    ...baseConfig.flowchart,
                    padding: 25,
                    nodeSpacing: 60,
                    rankSpacing: 70
                  },
                  themeVariables: {
                    primaryColor: '#064e3b',
                    primaryTextColor: '#ffffff',
                    primaryBorderColor: '#047857',
                    secondaryColor: '#10b981',
                    tertiaryColor: '#34d399',
                    lineColor: '#6b7280',
                    sectionBkgColor: '#064e3b',
                    altSectionBkgColor: '#047857',
                    gridColor: '#10b981',
                    titleColor: '#ffffff',
                    edgeLabelBackground: '#064e3b',
                    clusterBkg: '#064e3b',
                    clusterBorder: '#10b981'
                  }
                }
              }

              return {
                ...baseConfig,
                theme: ['light', 'dark', 'default', 'neutral'].includes(theme) ? theme : 'default',
                flowchart: {
                  ...baseConfig.flowchart,
                  padding: 25,
                  nodeSpacing: 60,
                  rankSpacing: 70
                }
              }
            }

            mermaid.initialize(getMermaidConfig(theme))

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

  // Helper functions for theme-based styling
  const getThemeClasses = (theme: string): string[] => {
    switch (theme) {
      case 'academic':
        return ['hover:scale-102']
      case 'elegant':
        return ['hover:scale-101']
      case 'professional':
        return ['hover:scale-102']
      case 'minimal':
        return ['hover:scale-100']
      case 'handdrawn':
        return [] // No shadow or scale effects for handdrawn
      default:
        return ['hover:scale-105']
    }
  }

  const getThemeFilter = (theme: string): string => {
    switch (theme) {
      case 'academic':
        return 'contrast(1.05) saturate(1.1)'
      case 'elegant':
        return 'contrast(1.02) saturate(1.05) brightness(1.02)'
      case 'professional':
        return 'contrast(1.03) saturate(1.08)'
      case 'minimal':
        return 'contrast(1.01) saturate(0.95)'
      case 'handdrawn':
        return 'contrast(0.95) saturate(1.2) brightness(1.05) sepia(0.1)'
      default:
        return 'none'
    }
  }

  const getThemeShadow = (theme: string): string => {
    switch (theme) {
      case 'academic':
        return '0 4px 6px -1px rgba(30, 58, 138, 0.1), 0 2px 4px -1px rgba(30, 58, 138, 0.06)'
      case 'elegant':
        return '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      case 'professional':
        return '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      case 'minimal':
        return '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      case 'handdrawn':
        return '0 8px 12px -2px rgba(107, 114, 128, 0.15), 0 4px 6px -1px rgba(107, 114, 128, 0.1)'
      default:
        return 'none'
    }
  }

  const getThemePrimaryColor = (theme: string): string => {
    switch (theme) {
      case 'academic':
        return '#1e3a8a'
      case 'elegant':
        return '#4c1d95'
      case 'professional':
        return '#1e293b'
      case 'minimal':
        return '#64748b'
      case 'handdrawn':
        return '#a16207'
      default:
        return '#3b82f6'
    }
  }

  const getThemeSecondaryColor = (theme: string): string => {
    switch (theme) {
      case 'academic':
        return '#7c3aed'
      case 'elegant':
        return '#a21caf'
      case 'professional':
        return '#475569'
      case 'minimal':
        return '#94a3b8'
      case 'handdrawn':
        return '#c084fc'
      default:
        return '#6366f1'
    }
  }

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

            // Style the SVG with enhanced academic and professional themes
            if (svgElement) {
              svgElement.setAttribute('role', 'img')
              svgElement.setAttribute('aria-label', `Mermaid diagram: ${originalText.split('\n')[0]}`)
              svgElement.setAttribute('title', 'Click to zoom diagram')
              svgElement.style.cursor = 'pointer'

              // Apply theme-based styling
              const themeClasses = getThemeClasses(theme)
              svgElement.classList.add(
                'w-full',
                'h-auto',
                ...themeClasses
              )

              // Enhanced visual styling - no border radius, shadows, or filters
              svgElement.style.filter = 'none'
              svgElement.style.borderRadius = '0px'

              // Special styling for handdrawn theme - no background or border
              if (theme === 'handdrawn') {
                // Keep only shadow effect, no background or border
              }

              // Apply theme-specific CSS variables
              svgElement.style.setProperty('--mermaid-primary', getThemePrimaryColor(theme))
              svgElement.style.setProperty('--mermaid-secondary', getThemeSecondaryColor(theme))

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

                // Apply enhanced theme-based styling for fallback rendering
                const themeClasses = getThemeClasses(theme)
                svgElement.classList.add(
                  'w-full',
                  'h-auto',
                  ...themeClasses
                )

                // Enhanced visual styling for fallback
                svgElement.style.filter = 'none' // No filters
                svgElement.style.borderRadius = '0px' // No border radius

                // Special styling for handdrawn theme - no background or border for fallback either
                if (theme === 'handdrawn') {
                  // Keep only shadow effect, no background or border
                }

                // Apply theme-specific CSS variables
                svgElement.style.setProperty('--mermaid-primary', getThemePrimaryColor(theme))
                svgElement.style.setProperty('--mermaid-secondary', getThemeSecondaryColor(theme))

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
                        list({
                          items,
                          ordered
                        }: { items?: any[]; ordered?: boolean }): string {
                          // Add null checks for items
                          if (!items || !Array.isArray(items)) {
                            return ordered ? '<ol class="prose-ol"></ol>' : '<ul class="prose-ul"></ul>'
                          }
            
                          const type = ordered ? 'ol' : 'ul'
                          const className = ordered ? 'prose-ol' : 'prose-ul'
                          const listItems = items.map(item => {
                            if (item && item.type === 'list_item') {
                              return this.listitem(item)
                            }
                            return ''
                          }).filter(item => item)
                          return `<${type} class="${className}">${listItems.join('')}</${type}>`
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
            list({ items, ordered }: { items?: any[]; ordered?: boolean }): string {
              // Add null checks for items
              if (!items || !Array.isArray(items)) {
                return ordered ? '<ol class="prose-ol"></ol>' : '<ul class="prose-ul"></ul>'
              }

              const type = ordered ? 'ol' : 'ul'
              const className = ordered ? 'prose-ol' : 'prose-ul'
              const listItems = items.map(item => {
                if (item && item.type === 'list_item') {
                  return this.listitem(item)
                }
                return ''
              }).filter(item => item)
              return `<${type} class="${className}">${listItems.join('')}</${type}>`
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