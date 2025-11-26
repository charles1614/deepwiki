import { test, expect } from '@playwright/test'

// Test data
const SSH_CONFIG = {
  host: 'localhost',
  port: 22,
  username: 'testuser',
  password: 'testpass'
}

test.describe('AI Terminal Navigation Persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Enable storage for tests
    await page.context.clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Login first
    await page.goto('/login')
    await page.fill('input[name="email"]', 'user@deepwiki.com')
    await page.fill('input[name="password"]', 'User123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('short navigation preserves AI connection', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Wait for connection to establish (mock the connection for testing)
    await page.waitForTimeout(2000)

    // Check initial connection status UI is rendered
    await expect(page.locator('[data-testid="ai-connection-status"]')).toBeVisible()
    await expect(page.locator('[data-testid="ai-connect-button"]')).toHaveText('Disconnect')

    // Navigate away for short duration (simulated)
    await page.goto('/dashboard')

    // Simulate short navigation by setting storage directly
    await page.evaluate(() => {
      const startTime = Date.now() - 3000 // 3 seconds ago
      sessionStorage.setItem('ai-navigation-timestamp', JSON.stringify({
        startTime
      }))
    })

    // Navigate back quickly
    await page.goBack()

    // Connection should be preserved and resumed
    await expect(page.locator('[data-testid="ai-connection-status"]')).toContainText('Active')

    // Terminal should be restored from storage
    await expect(page.locator('[data-testid="ai-terminal"]')).toBeVisible()
  })

  test('long navigation triggers reconnection workflow', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Wait for connection to establish
    await page.waitForTimeout(2000)

    // Check initial connection status
    await expect(page.locator('[data-testid="ai-connection-status"]')).toBeVisible()

    // Navigate away for long duration (simulated)
    await page.goto('/dashboard')

    // Simulate long navigation by setting storage
    await page.evaluate(() => {
      const startTime = Date.now() - (6 * 60 * 1000 + 5000) // 6+ minutes ago
      sessionStorage.setItem('ai-navigation-timestamp', JSON.stringify({
        startTime
      }))
    })

    // Navigate back after long duration
    await page.goBack()

    // Should show reconnection banner
    await expect(page.locator('[data-testid="ai-reconnection-banner"]')).toBeVisible()
    await expect(page.locator('text=Restoring Connection')).toBeVisible()
  })

  test('AI connection status appears in navigation', async ({ page }) => {
    // Navigate to AI page and establish connection
    await page.goto('/ai')
    await page.waitForTimeout(2000)

    // Check if connection status indicator appears in navigation
    await expect(page.locator('[data-testid="ai-connection-status-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="ai-connection-indicator"]')).toBeVisible()

    // Navigate to other pages - status should remain visible
    await page.goto('/dashboard')
    await expect(page.locator('[data-testid="ai-connection-status-container"]')).toBeVisible()

    await page.goto('/wiki')
    await expect(page.locator('[data-testid="ai-connection-status-container"]')).toBeVisible()

    await page.goto('/search')
    await expect(page.locator('[data-testid="ai-connection-status-container"]')).toBeVisible()
  })

  test('terminal state persistence works correctly', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Simulate terminal activity
    await page.evaluate(() => {
      const terminalState = {
        buffer: ['test line 1', 'test line 2', 'test line 3'],
        cursorPosition: { x: 10, y: 5 },
        dimensions: { cols: 80, rows: 24 },
        timestamp: Date.now()
      }
      sessionStorage.setItem('ai-terminal-state', JSON.stringify(terminalState))
    })

    // Navigate away and back
    await page.goto('/dashboard')
    await page.goBack()

    // Terminal should be restored
    await expect(page.locator('[data-testid="ai-terminal"]')).toBeVisible()

    // Verify terminal was restored (check for restored content)
    const hasRestoredContent = await page.evaluate(() => {
      const terminal = document.querySelector('[data-testid="ai-terminal"]')
      return terminal && terminal.innerHTML.includes('test line')
    })

    expect(hasRestoredContent).toBe(true)
  })

  test('file browser state persistence works correctly', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Simulate file browser activity
    await page.evaluate(() => {
      const fileBrowserState = {
        currentPath: '/home/user/documents',
        selectedFile: '/home/user/documents/test.md',
        scrollPosition: 150,
        timestamp: Date.now()
      }
      sessionStorage.setItem('ai-file-browser-state', JSON.stringify(fileBrowserState))
    })

    // Navigate away and back
    await page.goto('/dashboard')
    await page.goBack()

    // File browser should be restored
    await expect(page.locator('[data-testid="ai-file-browser"]')).toBeVisible()

    // Verify file browser was restored to correct path
    const hasRestoredPath = await page.evaluate(() => {
      const content = document.querySelector('[data-testid="ai-file-browser"]')
      return content && content.innerHTML.includes('/home/user/documents')
    })

    expect(hasRestoredPath).toBe(true)
  })

  test('connection error handling works correctly', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Simulate connection error
    await page.evaluate(() => {
      const event = new CustomEvent('ssh-error', { detail: 'Connection failed' })
      window.dispatchEvent(event)
    })

    // Should show error state
    await expect(page.locator('[data-testid="ai-connection-status"]')).toContainText('Error')

    // Should provide retry option
    await expect(page.locator('[data-testid="ai-manual-reconnect-button"]')).toBeVisible()
  })

  test('manual reconnection works correctly', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Simulate preserved connection
    await page.evaluate(() => {
      // Set connection status to preserved
      const statusIndicator = document.querySelector('[data-testid="ai-connection-indicator"]')
      if (statusIndicator) {
        statusIndicator.className = statusIndicator.className.replace('bg-green-500', 'bg-blue-500')
      }
    })

    // Click manual reconnect button
    await page.click('[data-testid="ai-manual-reconnect-button"]')

    // Should show reconnection banner
    await expect(page.locator('[data-testid="ai-reconnection-banner"]')).toBeVisible()
    await expect(page.locator('text=Restoring Connection')).toBeVisible()
  })

  test('storage cleanup works correctly', async ({ page }) => {
    // Navigate to AI page
    await page.goto('/ai')

    // Create expired state
    await page.evaluate(() => {
      const expiredState = {
        buffer: ['old line 1', 'old line 2'],
        cursorPosition: { x: 5, y: 3 },
        dimensions: { cols: 80, rows: 24 },
        timestamp: Date.now() - (31 * 60 * 1000) // 31 minutes ago
      }
      sessionStorage.setItem('ai-terminal-state', JSON.stringify(expiredState))
    })

    // Navigate away and back
    await page.goto('/dashboard')
    await page.goBack()

    // Expired state should be cleared
    const hasExpiredState = await page.evaluate(() => {
      return sessionStorage.getItem('ai-terminal-state')
    })

    expect(hasExpiredState).toBe(null)
  })
})