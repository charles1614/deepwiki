'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { extractHeadings, TocSection } from '@/lib/markdown/extractHeadings'

interface TableOfContentsProps {
  content: string
  className?: string
}

export function TableOfContents({ content, className = '' }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')

  // Extract headings from markdown content
  const sections = useMemo(() => extractHeadings(content), [content])

  // Flatten heading IDs for observer
  const headingIds = useMemo(() => {
    const ids: string[] = []
    sections.forEach((section) => {
      ids.push(section.heading.id)
      section.children.forEach((child) => ids.push(child.id))
    })
    return ids
  }, [sections])

  // Intersection Observer for active section tracking
  useEffect(() => {
    if (headingIds.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        if (visibleEntries.length > 0) {
          // Sort by position and take the topmost
          const topEntry = visibleEntries.reduce((top, entry) =>
            entry.boundingClientRect.top < top.boundingClientRect.top ? entry : top
          )
          setActiveId(topEntry.target.id)
        }
      },
      {
        // Observe when headings enter the top 20% of the viewport
        rootMargin: '-20% 0px -70% 0px',
        threshold: 0,
      }
    )

    // Small delay to ensure DOM elements are rendered
    const timeoutId = setTimeout(() => {
      headingIds.forEach((id) => {
        const element = document.getElementById(id)
        if (element) {
          observer.observe(element)
        }
      })
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      observer.disconnect()
    }
  }, [headingIds])

  // Smooth scroll to heading
  const handleClick = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Update URL hash without scrolling
      window.history.pushState(null, '', `#${id}`)
      setActiveId(id)
    }
  }, [])

  // Don't render if no headings
  if (sections.length === 0) return null

  return (
    <nav className={`toc-container ${className}`} aria-label="Table of contents">
      <div className="toc-header">
        <span className="toc-title">On this page</span>
      </div>
      <ul className="toc-list">
        {sections.map((section) => (
          <li key={section.heading.id} className="toc-section">
            <a
              href={`#${section.heading.id}`}
              onClick={(e) => handleClick(e, section.heading.id)}
              className={`toc-link toc-link-h2 ${activeId === section.heading.id ? 'toc-link-active' : ''}`}
            >
              {section.heading.text}
            </a>
            {section.children.length > 0 && (
              <ul className="toc-sublist">
                {section.children.map((child) => (
                  <li key={child.id}>
                    <a
                      href={`#${child.id}`}
                      onClick={(e) => handleClick(e, child.id)}
                      className={`toc-link toc-link-h3 ${activeId === child.id ? 'toc-link-active' : ''}`}
                    >
                      {child.text}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
