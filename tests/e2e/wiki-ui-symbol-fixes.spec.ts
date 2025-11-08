import { test, expect } from '@playwright/test'

test.describe('Wiki UI Symbol Fixes and Text Buttons', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test('should have text-only refresh and manage buttons without blocks', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to wiki page
    await page.goto('/wiki')
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible({ timeout: 10000 })

    // Check that refresh button is text-only with gray color
    const refreshButton = page.locator('[data-testid=refresh-button]')
    await expect(refreshButton).toBeVisible()
    await expect(refreshButton).toHaveText(/refresh/i)

    // Verify it's not a block button - should be text-styled
    await expect(refreshButton).toHaveClass(/text-gray/)
    await expect(refreshButton).not.toHaveClass(/bg-.*-600|button.*block/)

    // Check that manage button is text-only with appropriate color
    const manageButton = page.locator('[data-testid=manage-wikis-button]')
    await expect(manageButton).toBeVisible()
    await expect(manageButton).toHaveText(/manage/i)

    // In normal state, manage should have standard styling
    await expect(manageButton).not.toHaveClass(/bg-red-600|text-red-600/)
  })

  test('should have red-colored manage button when in manage mode', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to wiki page
    await page.goto('/wiki')
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible({ timeout: 10000 })

    // Click manage button to enter manage mode
    await page.click('[data-testid=manage-wikis-button]')

    // In manage mode, the manage button should change to red/cancel state
    const cancelButton = page.locator('[data-testid=manage-wikis-button]')
    await expect(cancelButton).toBeVisible()

    // Should have red styling for cancel state
    await expect(cancelButton).toHaveText(/cancel/i)
    await expect(cancelButton).toHaveClass(/text-red-600|bg-red-50/)
  })

  test('should not have character encoding issues (乱码)', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to wiki page
    await page.goto('/wiki')
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible({ timeout: 10000 })

    // Check that page title and headings are properly encoded
    await expect(page.locator('h1')).toContainText('Welcome to DeepWiki')
    await expect(page.locator('h2')).toContainText('Your Wikis')

    // Verify no garbled characters in common UI elements
    const pageText = await page.textContent('body')

    // Common encoding issues to check for
    const encodingIssues = ['�', '��', 'â€™', 'â€', 'â€"', 'â€˜', 'â€"']

    for (const issue of encodingIssues) {
      expect(pageText).not.toContain(issue)
    }

    // Check that specific wiki names display correctly
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible()

    // Verify proper encoding of wiki names and descriptions
    const wikiElements = page.locator('[data-testid=wiki-item]')
    if (await wikiElements.count() > 0) {
      const firstWikiText = await wikiElements.first().textContent()
      expect(firstWikiText).not.toMatch(/[�â€]/)
    }
  })

  test('should handle special characters in wiki content correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to an existing wiki
    await page.goto('/wiki')
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible({ timeout: 10000 })

    // Click on the first wiki to view its content
    const firstWikiItem = page.locator('[data-testid=wiki-item]').first()
    if (await firstWikiItem.count() > 0) {
      await firstWikiItem.click()

      // Wait for wiki content to load
      await page.waitForTimeout(2000)

      // Check that content renders without encoding issues
      const contentText = await page.textContent('main')
      expect(contentText).not.toMatch(/[�â€]/)

      // Verify proper display of common markdown elements
      await expect(page.locator('h1, h2, h3')).toHaveCount({ min: 1 })
    }
  })

  test('text buttons should be properly clickable and functional', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to wiki page
    await page.goto('/wiki')
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible({ timeout: 10000 })

    // Test refresh button functionality
    const refreshButton = page.locator('[data-testid=refresh-button]')
    await expect(refreshButton).toBeVisible()

    // Click refresh button and verify it works (page should reload content)
    await refreshButton.click()
    await page.waitForTimeout(1000)

    // Wiki list should still be visible after refresh
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible()

    // Test manage button functionality
    const manageButton = page.locator('[data-testid=manage-wikis-button]')
    await expect(manageButton).toBeVisible()

    // Click manage button
    await manageButton.click()

    // Should enter manage mode
    await expect(page.locator('[data-testid=bulk-actions]')).toBeVisible()

    // Click again to exit manage mode
    await manageButton.click()

    // Should exit manage mode
    await expect(page.locator('[data-testid=bulk-actions]')).not.toBeVisible()
  })
})