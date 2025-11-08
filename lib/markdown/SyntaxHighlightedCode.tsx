'use client'

import React, { useState, useCallback, useEffect } from 'react'

// Type definitions for themes
type ThemeName = 'dark' | 'light' | 'github' | 'vs2015' | 'atomDark' | 'default'

interface SyntaxHighlightedCodeProps {
  code: string
  language: string
  theme?: ThemeName
  inline?: boolean
  showLineNumbers?: boolean
  highlightLines?: number[]
  copyable?: boolean
  filename?: string
  diffMode?: boolean
  className?: string
}

interface SyntaxHighlighterComponentType {
  (props: any): React.ReactElement
}

// Language aliases
const languageAliases: Record<string, string> = {
  'js': 'javascript',
  'jsx': 'javascript',
  'ts': 'typescript',
  'tsx': 'typescript',
  'py': 'python',
  'rb': 'ruby',
  'sh': 'bash',
  'zsh': 'bash',
  'fish': 'bash',
  'yml': 'yaml',
  'dockerfile': 'docker'
}

export function SyntaxHighlightedCode({
  code,
  language,
  theme = 'default',
  inline = false,
  showLineNumbers = false,
  highlightLines = [],
  copyable = false,
  filename = '',
  diffMode = false,
  className = ''
}: SyntaxHighlightedCodeProps) {
  const [copySuccess, setCopySuccess] = useState(false)
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<SyntaxHighlighterComponentType | null>(null)
  const [themeObject, setThemeObject] = useState<any>(null)

  // Load syntax highlighter dynamically
  useEffect(() => {
    const loadSyntaxHighlighter = async () => {
      try {
        // Only load in browser environment
        if (typeof window !== 'undefined') {
          const { Prism } = await import('react-syntax-highlighter')
          const themes = await import('react-syntax-highlighter/dist/esm/styles/prism')

          const themeMap = {
            dark: themes.vscDarkPlus,
            light: themes.oneLight,
            github: themes.github,
            vs2015: themes.vs2015,
            atomDark: themes.atomDark,
            default: themes.vscDarkPlus
          }

          setSyntaxHighlighter(() => Prism)
          setThemeObject(themeMap[theme] || themeMap.default)
        }
      } catch (error) {
        console.warn('Failed to load syntax highlighter:', error)
      }
    }

    loadSyntaxHighlighter()
  }, [theme])

  // Resolve language aliases
  const resolvedLanguage = languageAliases[language.toLowerCase()] || language

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = code
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      try {
        document.execCommand('copy')
        setCopySuccess(true)
        setTimeout(() => setCopySuccess(false), 2000)
      } catch (fallbackError) {
        console.error('Failed to copy code:', fallbackError)
      }

      document.body.removeChild(textArea)
    }
  }, [code])

  // Base classes
  const baseClasses = [
    'syntax-highlighter',
    `${theme}-theme`,
    inline ? 'inline-code' : 'block-code',
    showLineNumbers ? 'with-line-numbers' : '',
    highlightLines.length > 0 ? 'highlight-lines' : '',
    diffMode ? 'diff-mode' : '',
    className
  ].filter(Boolean).join(' ')

  // Fallback component when syntax highlighter is not available
  if (!SyntaxHighlighter || typeof window === 'undefined') {
    if (inline) {
      return (
        <code
          className={`inline-syntax-highlighter ${baseClasses}`}
          role="code"
          aria-label={`${resolvedLanguage} code`}
          data-testid="syntax-highlighter"
          data-language={resolvedLanguage}
          data-style="fallback"
        >
          {code}
        </code>
      )
    }

    return (
      <div className={`code-block-container ${baseClasses}`}>
        {(filename || copyable) && (
          <div className="code-block-header">
            {filename && (
              <span className="code-filename" title={filename}>
                {filename}
              </span>
            )}
            {copyable && (
              <button
                type="button"
                className="copy-button"
                onClick={handleCopy}
                aria-label={copySuccess ? 'Copied!' : 'Copy code to clipboard'}
                title={copySuccess ? 'Copied!' : 'Copy code'}
                data-testid="copy-button"
              >
                {copySuccess ? (
                  <svg
                    className="copy-icon success"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                ) : (
                  <svg
                    className="copy-icon"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                )}
              </button>
            )}
          </div>
        )}

        <div
          className="syntax-highlighter-fallback"
          data-testid="syntax-highlighter"
          data-language={resolvedLanguage}
          data-style="fallback"
          role="code"
          aria-label={`${resolvedLanguage} code block`}
        >
          <pre className={`bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto ${baseClasses}`}>
            <code className="text-sm font-mono">{code}</code>
          </pre>
        </div>
      </div>
    )
  }

  // Full syntax highlighted component
  if (inline) {
    return (
      <code
        className={`inline-syntax-highlighter ${baseClasses}`}
        role="code"
        aria-label={`${resolvedLanguage} code`}
      >
        {code}
      </code>
    )
  }

  return (
    <div className={`code-block-container ${baseClasses}`}>
      {/* Header with filename and copy button */}
      {(filename || copyable) && (
        <div className="code-block-header">
          {filename && (
            <span className="code-filename" title={filename}>
              {filename}
            </span>
          )}
          {copyable && (
            <button
              type="button"
              className="copy-button"
              onClick={handleCopy}
              aria-label={copySuccess ? 'Copied!' : 'Copy code to clipboard'}
              title={copySuccess ? 'Copied!' : 'Copy code'}
              data-testid="copy-button"
            >
              {copySuccess ? (
                <svg
                  className="copy-icon success"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ) : (
                <svg
                  className="copy-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
          )}
        </div>
      )}

      {/* Syntax highlighted code */}
      <SyntaxHighlighter
        language={resolvedLanguage}
        style={themeObject}
        showLineNumbers={showLineNumbers}
        wrapLines={true}
        lineProps={(lineNumber) => {
          const isHighlighted = highlightLines.includes(lineNumber)
          return {
            className: isHighlighted ? 'highlighted-line' : '',
            style: {
              display: 'block',
              backgroundColor: isHighlighted ? 'rgba(255, 255, 0, 0.1)' : undefined
            }
          }
        }}
        PreTag="div"
        className="syntax-highlighter-content"
        data-testid="syntax-highlighter"
        data-language={resolvedLanguage}
        data-style={themeObject?.name || theme}
        role="code"
        aria-label={`${resolvedLanguage} code block`}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

export default SyntaxHighlightedCode