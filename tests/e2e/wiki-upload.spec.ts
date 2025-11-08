import { test, expect } from '@playwright/test'

test.describe('Wiki Upload Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test('upload progress should update incrementally for each file', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // Create test markdown files
    const testFiles = [
      { name: 'index.md', content: '# Test Wiki\n\nThis is a test wiki.' },
      { name: 'page1.md', content: '# Page 1\n\nContent for page 1.' },
      { name: 'page2.md', content: '# Page 2\n\nContent for page 2.' }
    ]

    // Create file objects
    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      return new File([buffer], tf.name, { type: 'text/markdown' })
    })

    // Select files
    await page.setInputFiles('[data-testid=file-input]', files)

    // Wait for file list to be populated
    await expect(page.locator('text=Selected Files: 3 files')).toBeVisible()
    await expect(page.locator('text=index.md')).toBeVisible()
    await expect(page.locator('text=page1.md')).toBeVisible()
    await expect(page.locator('text=page2.md')).toBeVisible()

    // Start upload
    await page.click('[data-testid=upload-button]')

    // Check that progress starts at 0 and increments gradually
    await expect(page.locator('[data-testid=upload-progress]')).toBeVisible()

    // Progress should not immediately jump to 100%
    const initialProgress = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow')
    expect(parseInt(initialProgress || '0')).toBeLessThan(100)

    // Wait for upload to complete
    await expect(page.locator('text=Upload completed successfully!')).toBeVisible({ timeout: 30000 })
  })

  test('should handle upload failure gracefully and show retry option', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // Mock a failed upload by intercepting the request
    await page.route('/api/wiki/upload', async (route) => {
      // Simulate a server error
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Upload failed: Server error' })
      })
    })

    // Create and select test files
    const testFiles = [
      { name: 'index.md', content: '# Test Wiki\n\nThis is a test wiki.' }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      return new File([buffer], tf.name, { type: 'text/markdown' })
    })

    await page.setInputFiles('[data-testid=file-input]', files)
    await expect(page.locator('text=Selected Files: 1 files')).toBeVisible()

    // Start upload
    await page.click('[data-testid=upload-button]')

    // Wait for upload to fail
    await expect(page.locator('[data-testid=error-message]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Upload failed: Server error')).toBeVisible()

    // Check that retry button is shown
    await expect(page.locator('[data-testid=retry-upload]')).toBeVisible()
    await expect(page.locator('text=Retry Upload')).toBeVisible()

    // Files should show error status
    await expect(page.locator('[data-testid="file-error-index.md"]')).toBeVisible()
  })

  test('retry upload should work after failure', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // First attempt: mock failure
    await page.route('/api/wiki/upload', async (route, request) => {
      const url = request.url()
      if (url.includes('attempt=1')) {
        // First attempt fails
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Upload failed: Server error' })
        })
      } else {
        // Second attempt succeeds (let it proceed to real API)
        await route.continue()
      }
    })

    // Create and select test files
    const testFiles = [
      { name: 'index.md', content: '# Test Wiki\n\nThis is a test wiki.' }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      return new File([buffer], tf.name, { type: 'text/markdown' })
    })

    await page.setInputFiles('[data-testid=file-input]', files)
    await expect(page.locator('text=Selected Files: 1 files')).toBeVisible()

    // Start upload (first attempt)
    await page.click('[data-testid=upload-button]')

    // Wait for upload to fail
    await expect(page.locator('[data-testid=error-message]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid=retry-upload]')).toBeVisible()

    // Click retry
    await page.click('[data-testid=retry-upload]')

    // Error message should disappear
    await expect(page.locator('[data-testid=error-message]')).not.toBeVisible({ timeout: 5000 })

    // Progress should restart from 0
    const retryProgress = await page.locator('[data-testid="progress-bar"]').getAttribute('aria-valuenow')
    expect(parseInt(retryProgress || '0')).toBeLessThan(50)

    // Upload should complete successfully on retry
    await expect(page.locator('text=Upload completed successfully!')).toBeVisible({ timeout: 30000 })
  })

  test('upload should work with 201 Created status', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // Mock successful upload with 201 status
    await page.route('/api/wiki/upload', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          wiki: {
            id: 'test-wiki-id',
            title: 'Test Wiki',
            slug: 'test-wiki',
            description: 'Wiki: Test Wiki'
          }
        })
      })
    })

    // Create and select test files
    const testFiles = [
      { name: 'index.md', content: '# Test Wiki\n\nThis is a test wiki.' }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      return new File([buffer], tf.name, { type: 'text/markdown' })
    })

    await page.setInputFiles('[data-testid=file-input]', files)
    await expect(page.locator('text=Selected Files: 1 files')).toBeVisible()

    // Start upload
    await page.click('[data-testid=upload-button]')

    // Upload should complete successfully even with 201 status
    await expect(page.locator('text=Upload completed successfully!')).toBeVisible({ timeout: 15000 })
  })

  test('each file should show individual progress during upload', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // Create test markdown files
    const testFiles = [
      { name: 'index.md', content: '# Test Wiki\n\nThis is a test wiki.' },
      { name: 'page1.md', content: '# Page 1\n\nContent for page 1.' },
      { name: 'page2.md', content: '# Page 2\n\nContent for page 2.' }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      return new File([buffer], tf.name, { type: 'text/markdown' })
    })

    await page.setInputFiles('[data-testid=file-input]', files)

    // Start upload
    await page.click('[data-testid=upload-button]')

    // Check that each file shows its own progress bar
    await expect(page.locator('[data-testid="progress-bar"]')).toHaveCount(4) // 3 files + 1 overall

    // Each file should show uploading status
    await expect(page.locator('text=Uploading...')).toHaveCount(4) // 3 files + 1 overall
  })

  test('upload can be cancelled and restarted', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.click('[data-testid=login-button]')
    await expect(page).toHaveURL('/wiki', { timeout: 10000 })

    // Create larger test files to ensure upload takes time
    const largeContent = '# Large Test Wiki\n\n'.repeat(10000)
    const testFiles = [
      { name: 'index.md', content: largeContent },
      { name: 'page1.md', content: largeContent }
    ]

    const files = testFiles.map(tf => {
      const buffer = Buffer.from(tf.content, 'utf-8')
      return new File([buffer], tf.name, { type: 'text/markdown' })
    })

    await page.setInputFiles('[data-testid=file-input]', files)

    // Start upload
    await page.click('[data-testid=upload-button]')

    // Wait for upload to start
    await expect(page.locator('[data-testid=upload-progress]')).toBeVisible()

    // Cancel upload
    await page.click('[data-testid=cancel-upload]')

    // Upload progress should disappear
    await expect(page.locator('[data-testid=upload-progress]')).not.toBeVisible({ timeout: 5000 })

    // Files should be back to pending state
    await expect(page.locator('text=Upload Wiki')).toBeVisible()

    // Can restart upload
    await page.click('[data-testid=upload-button]')
    await expect(page.locator('[data-testid=upload-progress]')).toBeVisible()
  })
})