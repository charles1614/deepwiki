/**
 * Utility to extract headings from markdown content for Table of Contents
 * Extracts H2 and H3 headings only (two-level hierarchy like GitBook)
 */

export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

export interface TocSection {
  heading: TocHeading
  children: TocHeading[]
}

/**
 * Generate heading ID matching MarkdownRenderer.tsx logic
 * @see lib/markdown/MarkdownRenderer.tsx:659
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/**
 * Extract H2 and H3 headings from markdown content
 * Returns hierarchical structure with H3s grouped under their parent H2
 */
export function extractHeadings(markdown: string): TocSection[] {
  if (!markdown) return []

  // Match ## and ### headings (H2 and H3 only)
  const headingRegex = /^(#{2,3})\s+(.+)$/gm
  const headings: TocHeading[] = []

  let match
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length as 2 | 3
    const text = match[2].trim()
    const id = generateHeadingId(text)

    headings.push({ id, text, level })
  }

  // Group H3s under their parent H2s
  const sections: TocSection[] = []
  let currentSection: TocSection | null = null

  for (const heading of headings) {
    if (heading.level === 2) {
      currentSection = { heading, children: [] }
      sections.push(currentSection)
    } else if (heading.level === 3 && currentSection) {
      currentSection.children.push(heading)
    }
    // H3s without a parent H2 are skipped (rare edge case)
  }

  return sections
}
