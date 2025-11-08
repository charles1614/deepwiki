'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'

interface MermaidExportProps {
  code: string
  diagramId: string
  filename?: string
  className?: string
  buttonClassName?: string
  svgOptions?: {
    backgroundColor?: string
    width?: number
    height?: number
  }
  pngOptions?: {
    backgroundColor?: string
    scale?: number
    quality?: number
  }
  labels?: {
    svg?: string
    png?: string
    preview?: string
  }
  exportOptions?: {
    svg?: boolean
    png?: boolean
    preview?: boolean
  }
}

interface ExportStatus {
  loading: boolean
  error: string | null
  success: string | null
}

export function MermaidExport({
  code,
  diagramId,
  filename = 'diagram',
  className = '',
  buttonClassName = '',
  svgOptions = {},
  pngOptions = {},
  labels = {},
  exportOptions = {
    svg: true,
    png: true,
    preview: true
  }
}: MermaidExportProps) {
  const [svgStatus, setSvgStatus] = useState<ExportStatus>({ loading: false, error: null, success: null })
  const [pngStatus, setPngStatus] = useState<ExportStatus>({ loading: false, error: null, success: null })
  const [showPreview, setShowPreview] = useState(false)
  const [previewSvg, setPreviewSvg] = useState<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)

  // Default labels
  const defaultLabels = {
    svg: 'Export as SVG',
    png: 'Export as PNG',
    preview: 'Preview'
  }

  const mergedLabels = { ...defaultLabels, ...labels }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Initialize Mermaid
  const initializeMermaid = useCallback(async () => {
    try {
      const mermaid = await import('mermaid')
      const mermaidLib = mermaid.default || mermaid

      if (mermaidLib && typeof mermaidLib.initialize === 'function') {
        mermaidLib.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 14,
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          }
        })
        return mermaidLib
      }
    } catch (error) {
      console.warn('Failed to initialize mermaid:', error)
    }
    return null
  }, [])

  // Export as SVG
  const exportAsSvg = useCallback(async () => {
    if (!code.trim()) return

    setSvgStatus({ loading: true, error: null, success: null })
    abortControllerRef.current = new AbortController()

    try {
      const mermaidLib = await initializeMermaid()
      if (!mermaidLib) {
        throw new Error('Failed to initialize mermaid')
      }

      const { svg } = await mermaidLib.render(`${diagramId}-export`, code)

      // Apply custom SVG options
      let processedSvg = svg
      if (svgOptions.backgroundColor) {
        processedSvg = processedSvg.replace(
          '<svg',
          `<svg style="background-color: ${svgOptions.backgroundColor}"`
        )
      }

      if (svgOptions.width || svgOptions.height) {
        processedSvg = processedSvg.replace(
          '<svg',
          `<svg width="${svgOptions.width || 800}" height="${svgOptions.height || 600}"`
        )
      }

      // Create download
      const blob = new Blob([processedSvg], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSvgStatus({ loading: false, error: null, success: 'SVG exported successfully!' })

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSvgStatus(prev => ({ ...prev, success: null }))
      }, 3000)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setSvgStatus({ loading: false, error: 'Failed to export SVG', success: null })
      }
    }
  }, [code, diagramId, filename, svgOptions, initializeMermaid])

  // Export as PNG
  const exportAsPng = useCallback(async () => {
    if (!code.trim()) return

    setPngStatus({ loading: true, error: null, success: null })
    abortControllerRef.current = new AbortController()

    try {
      const mermaidLib = await initializeMermaid()
      if (!mermaidLib) {
        throw new Error('Failed to initialize mermaid')
      }

      // Render SVG first
      const { svg } = await mermaidLib.render(`${diagramId}-png-export`, code)

      // Create canvas
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to create canvas context')
      }

      // Set canvas dimensions
      const scale = pngOptions.scale || 2
      const img = new Image()

      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject

        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const svgUrl = URL.createObjectURL(svgBlob)
        img.src = svgUrl
      })

      canvas.width = img.width * scale
      canvas.height = img.height * scale

      // Apply background color
      if (pngOptions.backgroundColor) {
        ctx.fillStyle = pngOptions.backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Draw SVG to canvas
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)

      // Convert to PNG
      canvas.toBlob((blob) => {
        if (blob && !abortControllerRef.current?.signal.aborted) {
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${filename}.png`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          URL.revokeObjectURL(url)

          setPngStatus({ loading: false, error: null, success: 'PNG exported successfully!' })

          // Clear success message after 3 seconds
          setTimeout(() => {
            setPngStatus(prev => ({ ...prev, success: null }))
          }, 3000)
        }
      }, 'image/png', pngOptions.quality || 0.9)
    } catch (error) {
      if (error.name !== 'AbortError') {
        setPngStatus({ loading: false, error: 'Failed to export PNG', success: null })
      }
    }
  }, [code, diagramId, filename, pngOptions, initializeMermaid])

  // Generate preview
  const generatePreview = useCallback(async () => {
    if (!code.trim()) return

    try {
      const mermaidLib = await initializeMermaid()
      if (!mermaidLib) {
        throw new Error('Failed to initialize mermaid')
      }

      const { svg } = await mermaidLib.render(`${diagramId}-preview`, code)
      setPreviewSvg(svg)
      setShowPreview(true)
    } catch (error) {
      console.error('Failed to generate preview:', error)
    }
  }, [code, diagramId, initializeMermaid])

  // Cancel ongoing operations
  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setSvgStatus({ loading: false, error: null, success: null })
    setPngStatus({ loading: false, error: null, success: null })
  }, [])

  return (
    <div className={`mermaid-export ${className}`} data-testid="mermaid-export-container">
      <div className="export-controls space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Export Diagram</h3>

        <div className="flex flex-wrap gap-2">
          {exportOptions.svg && (
            <button
              onClick={exportAsSvg}
              disabled={svgStatus.loading}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
              aria-label="Export diagram as SVG vector image"
              data-testid="export-svg-button"
            >
              {svgStatus.loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                mergedLabels.svg
              )}
            </button>
          )}

          {exportOptions.png && (
            <button
              onClick={exportAsPng}
              disabled={pngStatus.loading}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClassName}`}
              aria-label="Export diagram as PNG raster image"
              data-testid="export-png-button"
            >
              {pngStatus.loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                mergedLabels.png
              )}
            </button>
          )}

          {exportOptions.preview && (
            <button
              onClick={generatePreview}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${buttonClassName}`}
              aria-label="Show export preview"
            >
              {mergedLabels.preview}
            </button>
          )}

          {(svgStatus.loading || pngStatus.loading) && (
            <button
              onClick={cancelExport}
              className={`inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${buttonClassName}`}
              aria-label="Cancel export"
            >
              Cancel
            </button>
          )}
        </div>

        {/* Status Messages */}
        <div className="space-y-2" role="status" aria-live="polite" aria-atomic="true">
          {svgStatus.error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md" data-testid="svg-error">
              {svgStatus.error}
            </div>
          )}

          {svgStatus.success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md" data-testid="svg-success">
              {svgStatus.success}
            </div>
          )}

          {pngStatus.error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md" data-testid="png-error">
              {pngStatus.error}
            </div>
          )}

          {pngStatus.success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md" data-testid="png-success">
              {pngStatus.success}
            </div>
          )}
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Export Preview</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Close preview"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="border border-gray-200 rounded p-4 bg-gray-50">
                <div dangerouslySetInnerHTML={{ __html: previewSvg }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MermaidExport