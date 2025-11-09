import { test, expect } from '@playwright/test'

test('Demo: Version History Feature', async ({ page, request }) => {
  // Set a slower action timeout so you can see what's happening
  test.setTimeout(180000) // 3 minutes
  
  // Clear any existing session
  await page.context().clearCookies()

  // Generate unique email for demo
  const timestamp = Date.now()
  const testUserEmail = `demouser${timestamp}@example.com`

  // Step 1: Register a new user
  console.log('Step 1: Registering new user...')
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

  // Step 2: Create a test wiki
  console.log('Step 2: Creating test wiki...')
  const initialContent = `# Demo Wiki for Version History

This is a demo wiki to show version history functionality.

## Getting Started

Welcome to the demo wiki!

## Features

- Version control
- Edit history
- Rollback capability
`

  const testWikiSlug = `demo-wiki-version-history-${timestamp}`

  // Create wiki and page via test helper API
  const createWikiResponse = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
    headers: {
      'Cookie': cookieHeader,
      'Content-Type': 'application/json'
    },
    data: {
      title: 'Demo Wiki for Version History',
      slug: testWikiSlug,
      content: initialContent
    }
  })

  if (!createWikiResponse.ok()) {
    throw new Error(`Failed to create test wiki: ${await createWikiResponse.text()}`)
  }

  // Step 3: Navigate to the wiki
  console.log('Step 3: Navigating to wiki page...')
  await page.goto(`/wiki/${testWikiSlug}`, { waitUntil: 'networkidle' })

  // Wait for wiki page to be fully loaded
  await page.waitForSelector('body', { timeout: 10000 })
  await page.waitForSelector('[data-testid=file-list]', { timeout: 15000 })
  await page.waitForSelector('[data-testid=markdown-content]', { timeout: 15000 })
  
  // Pause here so you can see the wiki page
  console.log('✓ Wiki page loaded. Click "Resume" in Playwright Inspector to continue...')
  await page.pause()
  
  // Step 4: Make an edit to create a version
  console.log('Step 4: Making an edit to create a new version...')
  await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 10000 })
  await page.click('[data-testid=edit-button]')
  
  const contentTextarea = page.locator('[data-testid=content-textarea]')
  await contentTextarea.fill(`# Demo Wiki for Version History

This is a demo wiki to show version history functionality.

## Getting Started

Welcome to the demo wiki!

## Features

- Version control
- Edit history
- Rollback capability

## New Section Added

This section was added in the first edit to demonstrate version history.
`)

  await page.click('[data-testid=save-edit]')
  await expect(page.locator('[data-testid=edit-button]')).toBeVisible({ timeout: 15000 })
  
  console.log('✓ Edit saved. Click "Resume" to continue...')
  await page.pause()
  
  // Step 5: Enter manage mode
  console.log('Step 5: Entering manage mode...')
  const manageButton = page.locator('button:has-text("Manage")')
  if (await manageButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await manageButton.click()
    await page.waitForTimeout(1000)
  }
  
  console.log('✓ Manage mode activated. Click "Resume" to open version history...')
  await page.pause()
  
  // Step 6: Open version history
  console.log('Step 6: Opening version history modal...')
  const historyButton = page.locator('[data-testid^="history-"]').first()
  if (await historyButton.isVisible({ timeout: 10000 }).catch(() => false)) {
    await historyButton.click()
    
    // Wait for modal to open
    await expect(page.locator('[data-testid="version-history-modal"]')).toBeVisible({ timeout: 5000 })
    
    // Wait a bit for versions to load
    await page.waitForTimeout(2000)
    
    console.log('✓ Version history modal opened! You should see version history now.')
    console.log('Click "Resume" to close the modal...')
    await page.pause()
    
    // Close the modal
    const closeButton = page.locator('[data-testid="version-history-modal-close-button"]')
    if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeButton.click()
      await page.waitForTimeout(500)
    }
  } else {
    console.log('❌ History button not found')
    await page.pause()
  }
  
  // Final pause
  console.log('✓ Demo completed!')
  await page.pause()
})

