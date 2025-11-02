import { test, expect } from '@playwright/test'
import { promises as fs } from 'fs'
import path from 'path'
import { Buffer } from 'buffer'

test.describe('Wiki Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test.beforeEach(async () => {
    // Create test markdown files for upload
    const testFilesDir = path.join(process.cwd(), 'temp-test-files')

    // Clean up existing files if any
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true })
    } catch (error) {
      // Directory doesn't exist, continue
    }

    await fs.mkdir(testFilesDir, { recursive: true })

    // Create index.md with mermaid diagram
    await fs.writeFile(
      path.join(testFilesDir, 'index.md'),
      `# Test Wiki Documentation

This is a sample wiki for testing the complete workflow.

## Features

- **Markdown Rendering**: Supports headers, bold, *italic*
- **Code Blocks**: Both inline \`code\` and code blocks
- **Mermaid Diagrams**: Visual workflow representations

## Sample Diagram

\`\`\`mermaid
graph TD
    A[Upload Files] --> B[Process Markdown]
    B --> C[Store in R2]
    C --> D[Display Wiki]
    D --> E[Render Content]
\`\`\`

## Additional Content

This is a [link to example](https://example.com).

![Sample Image](https://via.placeholder.com/300x200)

> **Note**: This is a blockquote with important information.

### Code Example

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
\`\`\`
`
    )

    // Create additional markdown file
    await fs.writeFile(
      path.join(testFilesDir, 'api.md'),
      `# API Documentation

## Endpoints

### GET /api/wiki
List all available wikis.

### POST /api/wiki/upload
Upload new wiki files.

## Authentication

All API endpoints require authentication tokens.
`
    )

    // Create another markdown file
    await fs.writeFile(
      path.join(testFilesDir, 'deployment.md'),
      `# Deployment Guide

## Prerequisites

- Node.js 18+
- PostgreSQL database
- Cloudflare R2 bucket

## Environment Setup

Copy the example environment file:

\`\`\`bash
cp .env.example .env.local
\`\`\`

## Build and Deploy

\`\`\`bash
npm run build
npm start
\`\`\`
`
    )
  })

  test.afterAll(async () => {
    // Clean up test files
    const testFilesDir = path.join(process.cwd(), 'temp-test-files')
    try {
      await fs.rm(testFilesDir, { recursive: true, force: true })
    } catch (error) {
      console.log('Test files cleanup failed:', error)
    }
  })

  test('complete wiki upload and view workflow', async ({ page }) => {
    // Generate unique wiki name to avoid conflicts
    const timestamp = Date.now()
    const uniqueWikiTitle = `Test Wiki Documentation ${timestamp}`

    // 1. Navigate to login page
    await page.goto('/login')

    // 2. Login with test credentials
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')

    // 3. Wait for dashboard redirect
    await expect(page).toHaveURL('/dashboard', {
      timeout: 10000
    })

    // 4. Navigate to wikis section (if there's a wiki navigation)
    await page.locator('a[href*="/wiki"]').click().catch(() => {
      // If no wiki navigation, try going directly to wiki page
      page.goto('/wiki')
    })

    // 5. Look for wiki upload functionality
    await expect(page.locator('text=Upload Wiki Files')).toBeVisible({
      timeout: 5000
    })

    // 6. Upload test files
    const testFilesDir = path.join(process.cwd(), 'temp-test-files')
    const fileInputs = await page.locator('input[type="file"]')

    // Upload multiple files
    await fileInputs.setInputFiles([
      path.join(testFilesDir, 'index.md'),
      path.join(testFilesDir, 'api.md'),
      path.join(testFilesDir, 'deployment.md')
    ])

    // 7. Submit the upload
    await page.click('button:has-text("Upload Wiki")')

    // 8. Wait for upload to complete and wiki to appear in the list
    await expect(page.locator('.wiki-item h3:has-text("Test Wiki Documentation")')).toBeVisible({
      timeout: 15000
    })

    // 9. Click on the wiki to view it
    await page.locator('.wiki-item h3:has-text("Test Wiki Documentation")').click()

    // 10. Verify wiki content renders correctly
    await expect(page.locator('h1:has-text("Test Wiki Documentation")')).toBeVisible()
    await expect(page.locator('text=This is a sample wiki for testing the complete workflow')).toBeVisible()

    // 11. Test markdown rendering
    await expect(page.locator('strong:has-text("Markdown Rendering")')).toBeVisible()
    await expect(page.locator('em:has-text("italic")')).toBeVisible()
    await expect(page.locator('code:has-text("code")')).toBeVisible()

    // 12. Test link rendering
    await expect(page.locator('a[href="https://example.com"]:has-text("link to example")')).toBeVisible()

    // 13. Test image rendering
    await expect(page.locator('img[alt="Sample Image"]')).toBeVisible()

    // 14. Test blockquote rendering
    await expect(page.locator('blockquote:has-text("Note")')).toBeVisible()

    // 15. Test code block rendering
    const jsCodeBlock = page.locator('pre code.language-javascript')
    await expect(jsCodeBlock).toContainText('function greet(name)')
    await expect(jsCodeBlock).toContainText('console.log(greet(\'World\'))')

    // 16. Test mermaid diagram (should be present and rendered)
    await expect(page.locator('code.language-mermaid')).toBeVisible()

    // 17. Test sidebar file navigation
    await expect(page.locator('h3:has-text("Files")')).toBeVisible()
    await expect(page.locator('[data-testid="file-index.md"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-api.md"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-deployment.md"]')).toBeVisible()

    // 18. Navigate to different file
    await page.locator('[data-testid="file-api.md"]').click()
    await expect(page.locator('h1:has-text("API Documentation")')).toBeVisible()
    await expect(page.locator('text=List all available wikis')).toBeVisible()

    // 19. Test back navigation
    await page.locator('text=← Back').click()
    await expect(page.locator('text=Test Wiki Documentation')).toBeVisible()
  })

  test('wiki upload validation works correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/dashboard')

    // Navigate to wiki upload
    await page.goto('/wiki')

    // Try to upload without index.md
    const testFilesDir = path.join(process.cwd(), 'temp-test-files')
    const fileInputs = await page.locator('input[type="file"]')

    await fileInputs.setInputFiles([
      path.join(testFilesDir, 'api.md')
    ])

    await page.click('button:has-text("Upload Wiki")')

    // Should show validation error
    await expect(page.locator('text=index.md file is required')).toBeVisible()

    // Try with non-markdown files
    await fs.writeFile(path.join(testFilesDir, 'invalid.txt'), 'not a markdown file')
    await fileInputs.setInputFiles([
      path.join(testFilesDir, 'index.md'),
      path.join(testFilesDir, 'invalid.txt')
    ])

    await page.click('button:has-text("Upload Wiki")')

    // Should show file type error
    await expect(page.locator('text=Only markdown (.md) files are allowed')).toBeVisible()
  })

  test('wiki list displays correctly', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/dashboard')

    // Navigate to wiki list
    await page.goto('/wiki')

    // Should see upload section first
    await expect(page.locator('text=Upload Wiki Files')).toBeVisible()

    // If there are existing wikis, they should be displayed
    const wikiList = page.locator('[data-testid=wiki-list] .wiki-item')
    const wikiCount = await wikiList.count()

    if (wikiCount > 0) {
      // Should see wiki titles and descriptions
      await expect(wikiList.first()).toBeVisible()
      await expect(page.locator('.wiki-item h3').first()).toBeVisible()
      await expect(page.locator('.wiki-item p').first()).toBeVisible()

      // Should see upload dates
      await expect(page.locator('text=/Created|Updated/')).toBeVisible()
    } else {
      // Should show empty state
      await expect(page.locator('[data-testid="wiki-list-empty"]')).toBeVisible()
    }
  })

  test('file navigation within wiki works correctly', async ({ page }) => {
    // This test assumes a wiki already exists from the upload test
    // First, upload a test wiki
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')

    // Upload a test wiki if needed
    await page.goto('/wiki')

    const testFilesDir = path.join(process.cwd(), 'temp-test-files')
    const fileInputs = await page.locator('input[type="file"]')

    try {
      await fileInputs.setInputFiles([
        path.join(testFilesDir, 'index.md'),
        path.join(testFilesDir, 'api.md'),
        path.join(testFilesDir, 'deployment.md')
      ])
      await page.click('button:has-text("Upload Wiki")')
      await page.waitForTimeout(2000) // Wait for upload
    } catch (error) {
      // Wiki might already exist, continue
    }

    // Navigate to a wiki
    const wikiItems = page.locator('.wiki-item')
    const itemCount = await wikiItems.count()

    if (itemCount > 0) {
      await wikiItems.first().click()

      // Test file navigation
      await expect(page.locator('text=Files')).toBeVisible()

      const fileLinks = page.locator('[data-testid=file-list] button')
      const fileCount = await fileLinks.count()

      if (fileCount > 1) {
        // Click on different files
        await fileLinks.nth(1).click()

        // Should show loading state
        await expect(page.locator('text=Loading content')).toBeVisible({
          timeout: 3000
        })

        // Should eventually show content
        await expect(page.locator('.markdown-content')).toBeVisible({
          timeout: 10000
        })
      }
    }
  })

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/dashboard')

    // Navigate to wiki
    await page.goto('/wiki')

    // Upload form should be responsive
    await expect(page.locator('text=Upload Wiki Files')).toBeVisible()

    // Test file upload on mobile
    const testFilesDir = path.join(process.cwd(), 'temp-test-files')
    const fileInputs = await page.locator('input[type="file"]')

    await fileInputs.setInputFiles([
      path.join(testFilesDir, 'index.md')
    ])

    await page.click('button:has-text("Upload Wiki")')
    await page.waitForTimeout(2000)

    // Wiki view should adapt to mobile (sidebar might be hidden or collapsed)
    if (await page.locator('.wiki-item').count() > 0) {
      await page.locator('.wiki-item').first().click()

      // Content should still be readable
      await expect(page.locator('.markdown-content')).toBeVisible()

      // Mobile-specific navigation might be present
      const mobileMenu = page.locator('[data-testid=mobile-menu], button:has-text("Menu")')
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click()
        await expect(page.locator('text=Files')).toBeVisible()
      }
    }
  })
})

test.describe('Wiki Accessibility', () => {
  test('wiki upload form is accessible', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')

    // Navigate to wiki page
    await page.goto('/wiki')
    await page.waitForLoadState('networkidle')

    // Check if upload form is present
    await expect(page.locator('text=Upload Wiki Files')).toBeVisible()

    // Check for proper form labels - use the data-testid instead
    const fileInput = page.locator('[data-testid="file-input"]')
    await expect(fileInput).toBeVisible()

    // Check the label text
    await expect(page.locator('text=Select Markdown Files')).toBeVisible()

    // Check file input accessibility attributes
    await expect(fileInput).toHaveAttribute('accept', '.md')
    await expect(fileInput).toHaveAttribute('multiple')

    // Check upload button
    const uploadButton = page.locator('button:has-text("Upload Wiki")')
    await expect(uploadButton).toBeVisible()
  })

  test('wiki content is properly structured', async ({ page }) => {
    // Navigate to a wiki with content
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')

    // Upload test wiki first
    await page.goto('/wiki')
    const testFilesDir = path.join(process.cwd(), 'temp-test-files')

    try {
      await page.locator('input[type="file"]').setInputFiles([
        path.join(testFilesDir, 'index.md')
      ])
      await page.click('button:has-text("Upload Wiki")')
      await page.waitForTimeout(2000)
    } catch (error) {
      // Continue if wiki exists
    }

    // Navigate to wiki content
    const wikiItems = page.locator('.wiki-item')
    if (await wikiItems.count() > 0) {
      await wikiItems.first().click()

      // Check heading hierarchy
      await expect(page.locator('h1')).toBeVisible()

      // Check link accessibility
      const links = page.locator('a[href]')
      for (let i = 0; i < await links.count(); i++) {
        const link = links.nth(i)
        await expect(link).toHaveAttribute('href')
      }

      // Check image alt text
      const images = page.locator('img')
      for (let i = 0; i < await images.count(); i++) {
        const img = images.nth(i)
        await expect(img).toHaveAttribute('alt')
      }

      // Check code block accessibility
      const codeBlocks = page.locator('pre code')
      if (await codeBlocks.count() > 0) {
        await expect(codeBlocks.first()).toBeVisible()
      }
    }
  })

  test('keyboard navigation works in wiki viewer', async ({ page }) => {
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle')

    // Navigate to wiki list
    await page.goto('/wiki')
    await page.waitForLoadState('networkidle')

    // Test tab navigation through upload form
    await page.keyboard.press('Tab')

    // Wait a bit for focus to be applied
    await page.waitForTimeout(500)

    // Check if either the file input or a button is focused
    const focusedElements = page.locator('input:focus, button:focus')
    const focusedCount = await focusedElements.count()
    expect(focusedCount).toBeGreaterThan(0)

    // If wiki exists, test content navigation
    const wikiItems = page.locator('.wiki-item')
    if (await wikiItems.count() > 0) {
      await page.keyboard.press('Tab')
      await page.keyboard.press('Enter') // Should activate first wiki

      // Test file navigation with keyboard
      const fileLinks = page.locator('[data-testid=file-list] button')
      if (await fileLinks.count() > 1) {
        await page.keyboard.press('Tab')
        await expect(fileLinks.first()).toBeFocused()

        await page.keyboard.press('Tab')
        await expect(fileLinks.nth(1)).toBeFocused()

        await page.keyboard.press('Enter')
        // Should navigate to selected file
      }
    }
  })
})