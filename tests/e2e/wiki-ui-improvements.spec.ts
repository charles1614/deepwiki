import { test, expect } from '@playwright/test'

test.describe('Wiki UI Improvements', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test('Home button should not logout authenticated users', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')

    // Should be redirected to wiki page
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // Click Home button
    await page.click('[data-testid="tab-home"]')

    // Should stay authenticated and go to dashboard, not logout
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 })

    // Should still see user is authenticated (no login button visible)
    await expect(page.locator('[data-testid=login-button]')).not.toBeVisible()

    // Should see user-specific content
    await expect(page.locator('[data-testid=user-menu]')).toBeVisible()
  })

  test('Quick Access sidebar should not push content down', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki')

    // Get viewport dimensions
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('Viewport not set')

    // Check if we're on desktop (sidebar only shows on desktop)
    if (viewport.width >= 1024) {
      // Check that sidebar exists
      await expect(page.locator('[data-testid=wiki-sidebar]')).toBeVisible()

      // Check that main content is properly positioned
      const mainContent = page.locator('[data-testid=welcome-message]')
      await expect(mainContent).toBeVisible()

      // Get position of main content - should not be pushed down by sidebar
      const mainBox = await mainContent.boundingBox()
      if (!mainBox) throw new Error('Main content not found')

      // Main content should start near the top (not pushed down by sidebar)
      expect(mainBox.y).toBeLessThan(300)

      // Check that content and sidebar are side by side
      const sidebar = page.locator('[data-testid=wiki-sidebar]')
      const sidebarBox = await sidebar.boundingBox()
      if (!sidebarBox) throw new Error('Sidebar not found')

      // Sidebar should be on the right side
      expect(sidebarBox.x).toBeGreaterThan(mainBox.x + mainBox.width / 2)
    }
  })

  test('Search functionality should work correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki')

    // Get viewport to check responsive behavior
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('Viewport not set')

    let searchTestId = 'desktop-search-input'
    if (viewport.width < 768) {
      // Mobile: Open mobile menu first and use mobile search input
      await page.click('[data-testid=mobile-menu-toggle]')
      await expect(page.locator('[data-testid=main-nav]')).toBeVisible()
      searchTestId = 'search-input'
    }

    // Type in search input
    await page.fill(`[data-testid=${searchTestId}]`, 'test')

    // Should show search results (or loading state)
    await page.waitForTimeout(500) // Wait for debounced search

    // Check if search input has value
    await expect(page.locator(`[data-testid=${searchTestId}]`)).toHaveValue('test')

    // Submit search
    await page.press(`[data-testid=${searchTestId}]`, 'Enter')

    // Should navigate to search results page
    await expect(page).toHaveURL(/\/search\?q=test/, { timeout: 5000 })
  })

  test('Navigation breadcrumbs should work correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki')

    // Get viewport for responsive check
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('Viewport not set')

    if (viewport.width >= 768) {
      // Breadcrumb only shows on desktop
      await expect(page.locator('[data-testid=breadcrumb-nav]')).toBeVisible()

      // Should show Home > Wiki
      await expect(page.locator('[data-testid=breadcrumb-nav]')).toContainText('Home')
      await expect(page.locator('[data-testid=breadcrumb-nav]')).toContainText('Wiki')

      // Click Home breadcrumb
      await page.click('[data-testid=breadcrumb-nav] button:has-text("Home")')

      // Should navigate to dashboard (authenticated home)
      await expect(page).toHaveURL('/dashboard')
    }
  })

  test('Recent Wikis should display correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki')

    // Get viewport for responsive check
    const viewport = page.viewportSize()
    if (!viewport) throw new Error('Viewport not set')

    if (viewport.width >= 1024) {
      // Recent wikis only show on desktop
      const recentWikisSection = page.locator('[data-testid=wiki-sidebar]')
      await expect(recentWikisSection).toBeVisible()

      // Should show Quick Access section
      await expect(recentWikisSection).toContainText('Quick Access')

      // Should have functional Quick Access buttons
      const uploadButton = recentWikisSection.locator('button:has-text("Upload New Wiki")')
      await expect(uploadButton).toBeVisible()

      // Click Upload New Wiki
      await uploadButton.click()

      // Should navigate to upload page
      await expect(page).toHaveURL('/upload')
    }
  })

  test('Mobile navigation should work correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki')

    // Should see mobile menu toggle
    await expect(page.locator('[data-testid=mobile-menu-toggle]')).toBeVisible()

    // Open mobile menu
    await page.click('[data-testid=mobile-menu-toggle]')
    await expect(page.locator('[data-testid=main-nav]')).toBeVisible()

    // Should see navigation tabs
    await expect(page.locator('[data-testid=tab-home]').first()).toBeVisible()
    await expect(page.locator('[data-testid=tab-wiki]').first()).toBeVisible()
    await expect(page.locator('[data-testid=tab-upload]').first()).toBeVisible()
    await expect(page.locator('[data-testid=tab-search]').first()).toBeVisible()

    // Should see search input
    await expect(page.locator('[data-testid=search-input]')).toBeVisible()

    // Test search in mobile
    await page.fill('[data-testid=search-input]', 'mobile test')
    await page.press('[data-testid=search-input]', 'Enter')

    // Should navigate to search results
    await expect(page).toHaveURL(/\/search\?q=mobile%20test/, { timeout: 5000 })
  })

  test('Back navigation should work correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki')

    // Navigate to a specific wiki page (need to have a wiki first)
    // For this test, we'll manually navigate to a wiki page URL
    await page.goto('/wiki/test-wiki')

    // Should show back button on wiki detail page
    await expect(page.locator('[data-testid=nav-back-button]').first()).toBeVisible()

    // Click back button
    await page.click('[data-testid=nav-back-button]')

    // Should go back to wiki list
    await expect(page).toHaveURL('/wiki', { timeout: 5000 })
  })
})