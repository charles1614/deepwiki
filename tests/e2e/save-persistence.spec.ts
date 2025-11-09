import { test, expect } from '@playwright/test'

test.describe('Save Persistence After Hard Refresh', () => {
  let testUserEmail: string
  let testWikiSlug: string

  test.beforeEach(async ({ page, request }) => {
    // Clear any existing session
    await page.context().clearCookies()

    // Generate unique email for each test run
    const timestamp = Date.now()
    testUserEmail = `testuser${timestamp}@example.com`

    // Register and login
    await page.goto('/register')
    await page.fill('[data-testid=email]', testUserEmail)
    await page.fill('[data-testid=password]', 'Password123!')
    await page.fill('[data-testid=confirmPassword]', 'Password123!')
    await page.click('[data-testid=register-button]')
    
    // Wait for registration success
    await expect(page.locator('text=/Account created successfully/i')).toBeVisible({
      timeout: 10000
    })

    // Navigate to login if not auto-redirected
    try {
      await page.waitForURL('/wiki', { timeout: 3000 })
    } catch {
      await page.goto('/login')
      await page.fill('[data-testid=email]', testUserEmail)
      await page.fill('[data-testid=password]', 'Password123!')
      await page.click('[data-testid=login-button]')
      await expect(page).toHaveURL(/\/(dashboard|wiki)/, { timeout: 10000 })
    }

    // Get session cookies for API requests
    const cookies = await page.context().cookies()
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ')

    // Initial content for the wiki
    const initialContent = `# Test Wiki

This is the initial content.

## Section 1

Initial section.
`

    // Generate unique wiki slug
    testWikiSlug = `test-wiki-persistence-${timestamp}`

    // Create wiki and page via test helper API
    const createWikiResponse = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Test Wiki for Persistence',
        slug: testWikiSlug,
        content: initialContent
      }
    })

    if (!createWikiResponse.ok()) {
      throw new Error(`Failed to create test wiki: ${await createWikiResponse.text()}`)
    }

    // Navigate to the wiki
    await page.goto(`/wiki/${testWikiSlug}`, { waitUntil: 'networkidle' })

    // Wait for wiki page to be fully loaded
    await page.waitForSelector('body', { timeout: 10000 })
    await page.waitForSelector('[data-testid=file-list]', { timeout: 15000 })
    await page.waitForSelector('[data-testid=markdown-content]', { timeout: 15000 })
  })

  test('should persist changes after hard refresh (Cmd+Shift+R)', async ({ page }) => {
    test.setTimeout(90000) // 90 seconds
    
    // Step 1: Verify initial content
    console.log('Step 1: Verifying initial content...')
    await expect(page.locator('[data-testid=markdown-content]').first()).toBeVisible({ timeout: 10000 })
    const initialContent = await page.locator('[data-testid=markdown-content]').first().textContent()
    expect(initialContent).toContain('Test Wiki')
    expect(initialContent).toContain('Initial section')
    console.log('✓ Initial content verified')

    // Step 2: Enter edit mode
    console.log('Step 2: Entering edit mode...')
    await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 10000 })
    await page.click('[data-testid=edit-button]')
    await expect(page.locator('[data-testid=content-textarea]')).toBeVisible({ timeout: 5000 })
    console.log('✓ Edit mode entered')

    // Step 3: Make modifications
    console.log('Step 3: Making modifications...')
    const contentTextarea = page.locator('[data-testid=content-textarea]')
    const modifiedContent = `# Test Wiki - Modified

This is the modified content after save.

## Section 1

Initial section.

## New Section Added

This is a new section added after modification.
`
    await contentTextarea.fill(modifiedContent)
    console.log('✓ Content modified')

    // Step 4: Save changes
    console.log('Step 4: Saving changes...')
    await page.click('[data-testid=save-edit]')

    // Wait for save to complete
    await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-testid=content-textarea]')).not.toBeVisible({ timeout: 5000 })
    console.log('✓ Changes saved')

    // Step 5: Verify content is updated in UI
    console.log('Step 5: Verifying content in UI...')
    await expect(page.locator('h1:has-text("Test Wiki - Modified")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('h2:has-text("New Section Added")')).toBeVisible({ timeout: 10000 })
    console.log('✓ Content verified in UI')

    // Step 6: Perform hard refresh (reload with cache bypass)
    console.log('Step 6: Performing hard refresh...')
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 })
    
    // Wait for page to be fully loaded
    console.log('Step 7: Waiting for page to load...')
    await page.waitForSelector('[data-testid=file-list]', { timeout: 15000 })
    await expect(page.locator('[data-testid=markdown-content]').first()).toBeVisible({ timeout: 15000 })
    console.log('✓ Page reloaded')

    // Step 8: Verify content is still persisted after hard refresh
    console.log('Step 8: Verifying persisted content...')
    const contentAfterRefresh = await page.locator('[data-testid=markdown-content]').first().textContent()
    
    // The modified content should still be there
    expect(contentAfterRefresh).toContain('Test Wiki - Modified')
    expect(contentAfterRefresh).toContain('New Section Added')
    expect(contentAfterRefresh).toContain('This is a new section added after modification')
    
    // The old content should not be there
    expect(contentAfterRefresh).not.toContain('This is the initial content')
    console.log('✓ Content persisted correctly after refresh')
  })

  test('should persist changes after multiple edits and hard refresh', async ({ page }) => {
    test.setTimeout(90000) // 90 seconds
    
    // Step 1: First edit
    console.log('Step 1: First edit...')
    await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 10000 })
    await page.click('[data-testid=edit-button]')

    const contentTextarea = page.locator('[data-testid=content-textarea]')
    await contentTextarea.fill(`# First Edit

First modification.
`)

    await page.click('[data-testid=save-edit]')
    await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h1:has-text("First Edit")')).toBeVisible({ timeout: 10000 })
    console.log('✓ First edit saved')

    // Step 2: Second edit
    console.log('Step 2: Second edit...')
    await page.click('[data-testid=edit-button]')
    await expect(page.locator('[data-testid=content-textarea]')).toBeVisible({ timeout: 5000 })
    await contentTextarea.fill(`# Second Edit

Second modification.
`)

    await page.click('[data-testid=save-edit]')
    await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h1:has-text("Second Edit")')).toBeVisible({ timeout: 10000 })
    console.log('✓ Second edit saved')

    // Step 3: Hard refresh (reload with cache bypass)
    console.log('Step 3: Performing hard refresh...')
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 10000 })
    
    // Wait for page to be fully loaded
    await page.waitForSelector('[data-testid=file-list]', { timeout: 15000 })
    await page.waitForSelector('[data-testid=markdown-content]', { timeout: 15000 })
    console.log('✓ Page reloaded')

    // Step 4: Verify second edit is persisted
    console.log('Step 4: Verifying persisted content...')
    const contentAfterRefresh = await page.locator('[data-testid=markdown-content]').first().textContent()
    expect(contentAfterRefresh).toContain('Second Edit')
    expect(contentAfterRefresh).toContain('Second modification')
    expect(contentAfterRefresh).not.toContain('First Edit')
    console.log('✓ Content persisted correctly')
  })
})

