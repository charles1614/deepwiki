import { test, expect } from '@playwright/test'

test.describe('Wiki Management Improvements', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test('dashboard statistics should show actual numbers instead of "-"', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Since login redirects to /wiki, navigate to dashboard to test statistics
    await page.goto('/dashboard')

    // Wait for dashboard to load
    await expect(page.locator('[data-testid=dashboard-welcome]')).toBeVisible()

    // Check that statistics are not hardcoded '-'
    const totalWikisElement = page.locator('[data-testid=stats-total-wikis] .text-2xl')
    const recentUploadsElement = page.locator('[data-testid=stats-recent-uploads] .text-2xl')
    const documentsElement = page.locator('[data-testid=stats-total-documents] .text-2xl')

    // Statistics should not be '-' after loading
    await expect(totalWikisElement).not.toContainText('-')
    await expect(recentUploadsElement).not.toContainText('-')
    await expect(documentsElement).not.toContainText('-')

    // Should contain valid numbers (including 0)
    const totalWikisText = await totalWikisElement.textContent()
    const recentUploadsText = await recentUploadsElement.textContent()
    const documentsText = await documentsElement.textContent()

    // Verify they are numeric values or "0"
    expect(totalWikisText).toMatch(/^\d+$/)
    expect(recentUploadsText).toMatch(/^\d+$/)
    expect(documentsText).toMatch(/^\d+$/)
  })

  test('markdown tables should render correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Create test markdown content with table
    const tableContent = `# Test Wiki with Table

This is a test table:

| Name | Age | City |
|------|-----|------|
| John | 25  | NYC  |
| Jane | 30  | LA   |
| Bob  | 35  | Chicago |

Another paragraph after the table.
`

    // Upload a wiki with table content
    const testFiles = [
      { name: 'index.md', content: tableContent }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      const file = new File([buffer], tf.name, { type: 'text/markdown' })
      // Ensure the file has the correct buffer property
      Object.defineProperty(file, 'buffer', {
        value: buffer,
        writable: false
      })
      return file
    })

    // Navigate to upload page and upload
    await page.goto('/upload')
    await page.setInputFiles('[data-testid=file-input]', files)
    await page.click('[data-testid=upload-button]')

    // Wait for upload to complete
    await expect(page.locator('text=Upload completed successfully!')).toBeVisible({ timeout: 30000 })

    // Navigate to the uploaded wiki
    await page.goto('/wiki/test-wiki-with-table')

    // Check that table is rendered correctly
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('thead')).toBeVisible()
    await expect(page.locator('tbody')).toBeVisible()
    await expect(page.locator('th')).toHaveCount(3) // Name, Age, City
    await expect(page.locator('tbody tr')).toHaveCount(3) // John, Jane, Bob

    // Check table content
    await expect(page.locator('table')).toContainText('Name')
    await expect(page.locator('table')).toContainText('Age')
    await expect(page.locator('table')).toContainText('City')
    await expect(page.locator('table')).toContainText('John')
    await expect(page.locator('table')).toContainText('25')
    await expect(page.locator('table')).toContainText('NYC')
  })

  test('wikis should not appear duplicate in the UI', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to wiki page
    await page.goto('/wiki')

    // Wait for wiki list to load
    await expect(page.locator('[data-testid=wiki-list]')).toBeVisible({ timeout: 10000 })

    // Get all wiki items
    const wikiItems = page.locator('[data-testid=wiki-item]')

    // Count unique wiki titles
    const wikiTitles = await wikiItems.allInnerTexts()
    const uniqueTitles = new Set(wikiTitles.map(title => title.split('\n')[0].trim()))

    // The number of unique titles should equal the number of items
    expect(uniqueTitles.size).toBe(wikiItems.count())
  })

  test('should have manage wikis functionality with delete option', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Navigate to wiki page
    await page.goto('/wiki')

    // Should have a manage wikis button or toggle
    await expect(page.locator('[data-testid=manage-wikis-button]')).toBeVisible()

    // Click manage wikis
    await page.click('[data-testid=manage-wikis-button]')

    // Should show selection checkboxes
    await expect(page.locator('[data-testid=wiki-checkbox]')).toBeVisible()

    // Should have bulk actions
    await expect(page.locator('[data-testid=bulk-actions]')).toBeVisible()
    await expect(page.locator('[data-testid=delete-selected-button]')).toBeVisible()

    // Should be able to select wikis for deletion
    const firstCheckbox = page.locator('[data-testid=wiki-checkbox]').first()
    await firstCheckbox.check()

    // Delete button should be enabled when items are selected
    await expect(page.locator('[data-testid=delete-selected-button]')).toBeEnabled()

    // Should show confirmation dialog before deletion
    await page.click('[data-testid=delete-selected-button]')
    await expect(page.locator('[data-testid=delete-confirmation-dialog]')).toBeVisible()
    await expect(page.locator('[data-testid=confirm-delete-button]')).toBeVisible()
    await expect(page.locator('[data-testid=cancel-delete-button]')).toBeVisible()
  })

  test('delete wiki functionality should work correctly', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // First upload a test wiki to delete
    const testContent = '# Test Wiki to Delete\n\nThis wiki will be deleted.'
    const testFiles = [
      { name: 'index.md', content: testContent }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      const file = new File([buffer], tf.name, { type: 'text/markdown' })
      // Ensure the file has the correct buffer property
      Object.defineProperty(file, 'buffer', {
        value: buffer,
        writable: false
      })
      return file
    })

    // Upload test wiki
    await page.goto('/upload')
    await page.setInputFiles('[data-testid=file-input]', files)
    await page.click('[data-testid=upload-button]')
    await expect(page.locator('text=Upload completed successfully!')).toBeVisible({ timeout: 30000 })

    // Navigate to wiki page
    await page.goto('/wiki')

    // Enter manage mode
    await page.click('[data-testid=manage-wikis-button]')

    // Find and select the test wiki
    const wikiItems = page.locator('[data-testid=wiki-item]')
    const testWikiItem = wikiItems.filter({ hasText: 'Test Wiki to Delete' }).first()
    await expect(testWikiItem).toBeVisible()

    const checkbox = testWikiItem.locator('[data-testid=wiki-checkbox]')
    await checkbox.check()

    // Delete the wiki
    await page.click('[data-testid=delete-selected-button]')
    await page.click('[data-testid=confirm-delete-button]')

    // Should show success message
    await expect(page.locator('[data-testid=delete-success-message]')).toBeVisible()

    // Wiki should be removed from the list
    await expect(testWikiItem).not.toBeVisible()

    // Exit manage mode
    await page.click('[data-testid=manage-wikis-button]')

    // Verify wiki is no longer in the list
    await expect(page.locator('text=Test Wiki to Delete')).not.toBeVisible()
  })

  test('statistics should update after wiki operations', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })

    // Get initial statistics
    const initialTotalWikis = await page.locator('[data-testid=stats-total-wikis] .text-2xl').textContent()
    const initialDocuments = await page.locator('[data-testid=stats-total-documents] .text-2xl').textContent()

    // Upload a new wiki
    const testContent = '# Statistics Test Wiki\n\nTesting statistics update.'
    const testFiles = [
      { name: 'index.md', content: testContent },
      { name: 'page1.md', content: 'Additional page content.' }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      const file = new File([buffer], tf.name, { type: 'text/markdown' })
      // Ensure the file has the correct buffer property
      Object.defineProperty(file, 'buffer', {
        value: buffer,
        writable: false
      })
      return file
    })

    await page.goto('/upload')
    await page.setInputFiles('[data-testid=file-input]', files)
    await page.click('[data-testid=upload-button]')
    await expect(page.locator('text=Upload completed successfully!')).toBeVisible({ timeout: 30000 })

    // Go back to dashboard
    await page.goto('/dashboard')

    // Wait for statistics to update
    await page.waitForTimeout(2000)

    // Get updated statistics
    const updatedTotalWikis = await page.locator('[data-testid=stats-total-wikis] .text-2xl').textContent()
    const updatedDocuments = await page.locator('[data-testid=stats-total-documents] .text-2xl').textContent()

    // Statistics should have increased
    expect(parseInt(updatedTotalWikis || '0')).toBe(parseInt(initialTotalWikis || '0') + 1)
    expect(parseInt(updatedDocuments || '0')).toBeGreaterThan(parseInt(initialDocuments || '0'))
  })
})