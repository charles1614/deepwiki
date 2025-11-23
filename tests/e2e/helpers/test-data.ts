/**
 * E2E test data generators
 * Provides consistent test data for E2E tests
 */

/**
 * Generate unique test user data
 */
export function generateTestUser(prefix: string = 'testuser') {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  
  return {
    email: `${prefix}-${timestamp}-${random}@example.com`,
    password: 'Password123!',
    confirmPassword: 'Password123!',
  }
}

/**
 * Generate unique wiki data
 */
export function generateTestWiki(prefix: string = 'test-wiki', options: { isPublic?: boolean } = {}) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)

  return {
    title: `Test Wiki ${timestamp}`,
    slug: `${prefix}-${timestamp}-${random}`,
    description: `Test wiki description ${timestamp}`,
    isPublic: options.isPublic ?? false, // Default to private
    content: `# Test Wiki ${timestamp}

This is a test wiki created for E2E testing.

## Getting Started

Welcome to the test wiki!

## Features

- Feature 1
- Feature 2
- Feature 3

## Code Example

\`\`\`javascript
function test() {
  console.log('Hello, World!')
}
\`\`\`
`,
  }
}

/**
 * Generate test markdown content
 */
export function generateTestMarkdown(options: {
  title?: string
  sections?: number
  includeCode?: boolean
  includeMermaid?: boolean
} = {}): string {
  const {
    title = 'Test Document',
    sections = 3,
    includeCode = true,
    includeMermaid = false,
  } = options

  let content = `# ${title}\n\n`

  for (let i = 1; i <= sections; i++) {
    content += `## Section ${i}\n\n`
    content += `This is the content for section ${i}.\n\n`
  }

  if (includeCode) {
    content += `## Code Example\n\n`
    content += `\`\`\`javascript\n`
    content += `function example() {\n`
    content += `  console.log('Hello, World!')\n`
    content += `}\n`
    content += `\`\`\`\n\n`
  }

  if (includeMermaid) {
    content += `## Diagram\n\n`
    content += `\`\`\`mermaid\n`
    content += `graph TD\n`
    content += `    A[Start] --> B{Decision}\n`
    content += `    B -->|Yes| C[Action 1]\n`
    content += `    B -->|No| D[Action 2]\n`
    content += `    C --> E[End]\n`
    content += `    D --> E\n`
    content += `\`\`\`\n\n`
  }

  return content
}

/**
 * Generate test file data
 */
export function generateTestFile(options: {
  filename?: string
  content?: string
} = {}): { filename: string; content: string } {
  const { filename = 'test.md', content } = options

  return {
    filename,
    content: content || generateTestMarkdown({ title: filename.replace('.md', '') }),
  }
}

/**
 * Generate multiple test files
 */
export function generateTestFiles(count: number): Array<{ filename: string; content: string }> {
  const filenames = [
    'index.md',
    'overview.md',
    'getting-started.md',
    'api-reference.md',
    'examples.md',
    'troubleshooting.md',
  ]

  return Array.from({ length: count }, (_, index) =>
    generateTestFile({
      filename: filenames[index] || `file-${index + 1}.md`,
    })
  )
}

