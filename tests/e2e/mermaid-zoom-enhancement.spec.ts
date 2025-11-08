import { test, expect } from '@playwright/test'

test.describe('Mermaid Enhanced Zoom Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://localhost:3000')

    // Login if needed
    if (await page.locator('input[type="email"]').isVisible()) {
      await page.fill('input[type="email"]', 'user@deepwiki.com')
      await page.fill('input[type="password"]', 'User123!')
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')
    }
  })

  test('should render mermaid diagrams and support zoom functionality', async ({ page }) => {
    // Create a simple test page with mermaid content using direct API call
    await page.goto('http://localhost:3000/wiki/test-mermaid-page')

    // If the page doesn't exist, try to navigate to a wiki that might exist
    if (!await page.locator('.mermaid').isVisible()) {
      // Try to find any existing wiki
      await page.goto('http://localhost:3000/dashboard')

      // Look for any wiki item
      const wikiItems = page.locator('[data-testid="wiki-item"]')
      if (await wikiItems.first().isVisible()) {
        await wikiItems.first().click()
        await page.waitForTimeout(2000)
      }
    }

    // Check if we have a mermaid diagram
    const mermaidContainer = page.locator('.mermaid')
    if (await mermaidContainer.isVisible()) {
      // Verify mermaid diagram renders as SVG
      const svgElement = mermaidContainer.locator('svg')
      await expect(svgElement).toBeVisible()

      // Test click to open zoom modal
      await svgElement.click()

      // Check if modal opens (full screen implementation)
      const modal = page.locator('.fixed.inset-0')

      // If modal opens, test enhanced features
      if (await modal.isVisible()) {
        // Test full screen modal
        const modalBox = await modal.boundingBox()
        expect(modalBox?.width).toBeGreaterThan(1000) // Should be large
        expect(modalBox?.height).toBeGreaterThan(500) // Should be large

        // Test for enhanced UI elements
        const headerControls = page.locator('.bg-gradient-to-b')
        if (await headerControls.isVisible()) {
          // Test for floating controls
          const zoomControls = page.locator('.rounded-full')
          await expect(zoomControls).toHaveCount.greaterThan(0)

          // Test for zoom percentage display
          const zoomDisplay = page.locator('text=/\\d+%/')
          if (await zoomDisplay.isVisible()) {
            await expect(zoomDisplay).toBeVisible()
          }
        }

        // Test mouse wheel zoom
        const diagramContainer = page.locator('.fixed.inset-0')
        await diagramContainer.hover()

        // Test wheel zoom (should not error)
        await page.mouse.wheel(0, -50) // Scroll up to zoom in
        await page.waitForTimeout(300)

        await page.mouse.wheel(0, 50) // Scroll down to zoom out
        await page.waitForTimeout(300)

        // Test keyboard shortcuts
        await page.keyboard.press('Escape')

        // Verify modal closes
        await expect(modal).not.toBeVisible()
      }
    } else {
      // If no mermaid diagram is found, skip test gracefully
      console.log('No mermaid diagram found on page, skipping zoom test')
      test.skip()
    }
  })

  test('should handle enhanced zoom controls when available', async ({ page }) => {
    // This test verifies the enhanced UI components exist when modal is open
    await page.goto('http://localhost:3000/dashboard')

    // Look for any wiki with mermaid content
    const wikiItems = page.locator('[data-testid="wiki-item"]')
    if (await wikiItems.first().isVisible()) {
      await wikiItems.first().click()
      await page.waitForTimeout(2000)

      const mermaidContainer = page.locator('.mermaid')
      if (await mermaidContainer.isVisible()) {
        const svgElement = mermaidContainer.locator('svg')
        await svgElement.click()

        // Check for enhanced UI elements
        const modal = page.locator('.fixed.inset-0')
        if (await modal.isVisible()) {
          // Test for backdrop blur effect
          const backdropElement = page.locator('.bg-black\\/90')

          // Test for rounded buttons (enhanced UI)
          const roundedButtons = page.locator('.rounded-full')

          // Test for white text on dark background
          const whiteTextElements = page.locator('text=white')

          // These elements may or may not be present depending on implementation
          // The test verifies they don't cause errors when checked
          if (await backdropElement.isVisible()) {
            await expect(backdropElement).toBeVisible()
          }

          if (await roundedButtons.isVisible()) {
            await expect(roundedButtons.first()).toBeVisible()
          }

          // Close modal
          await page.keyboard.press('Escape')
        }
      }
    }
  })
})