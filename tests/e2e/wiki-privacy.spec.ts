import { test, expect } from './helpers/fixtures'
import { prisma } from '@/lib/database'
import bcrypt from 'bcryptjs'
import { generateTestUser, generateTestWiki } from './helpers/test-data'

test.describe('Wiki Privacy', () => {
  test('should create wikis as private by default', async ({ authenticatedPage, request }) => {
    // Create a test wiki via API to verify default privacy
    const timestamp = Date.now()
    const testWiki = generateTestWiki('privacy-test')

    // Get session cookies
    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    // Create wiki via API
    const response = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: testWiki,
    })

    expect(response.ok()).toBeTruthy()
    const createdWiki = await response.json()

    // Verify wiki is private by default
    await authenticatedPage.goto(`/wiki/${testWiki.slug}`)
    await authenticatedPage.waitForSelector('[data-testid="wiki-content"]', { timeout: 10000 })

    // Check for private indicator (should show as private)
    const privateIndicator = authenticatedPage.locator('[data-testid="privacy-indicator"]')
    await expect(privateIndicator).toBeVisible()
    await expect(privateIndicator).toContainText('Private')

    // Verify privacy toggle exists and shows private state
    const privacyToggle = authenticatedPage.locator('[data-testid="privacy-toggle"]')
    await expect(privacyToggle).toBeVisible()

    const privacyStatus = authenticatedPage.locator('[data-testid="privacy-status"]')
    await expect(privacyStatus).toHaveText('Private')

    // Cleanup
    await prisma.wiki.delete({ where: { slug: testWiki.slug } })
  })

  test('should toggle wiki privacy from private to public', async ({ authenticatedPage, request }) => {
    // Create a private wiki
    const testWiki = generateTestWiki('private-to-public')

    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const response = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: testWiki,
    })

    expect(response.ok()).toBeTruthy()

    // Navigate to wiki and enter manage mode
    await authenticatedPage.goto(`/wiki/${testWiki.slug}`)
    await authenticatedPage.waitForSelector('[data-testid="wiki-content"]', { timeout: 10000 })

    // Enter manage mode
    const manageButton = authenticatedPage.locator('button:has-text("Manage")')
    await expect(manageButton).toBeVisible()
    await manageButton.click()
    await authenticatedPage.waitForTimeout(500)

    // Click privacy toggle to make public
    const privacyToggle = authenticatedPage.locator('[data-testid="privacy-toggle"]')
    await expect(privacyToggle).toBeVisible()
    await privacyToggle.click()

    // Handle confirmation dialog
    await authenticatedPage.waitForSelector('[data-testid="confirm-privacy-dialog"]', { timeout: 5000 })
    const confirmButton = authenticatedPage.locator('[data-testid="confirm-public-button"]')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for success message
    await authenticatedPage.waitForSelector('[data-testid="privacy-success-toast"]', { timeout: 10000 })

    // Verify wiki is now public
    const privacyStatus = authenticatedPage.locator('[data-testid="privacy-status"]')
    await expect(privacyStatus).toHaveText('Public')

    const publicIndicator = authenticatedPage.locator('[data-testid="privacy-indicator"]')
    await expect(publicIndicator).toContainText('Public')

    // Cleanup
    await prisma.wiki.delete({ where: { slug: testWiki.slug } })
  })

  test('should toggle wiki privacy from public to private', async ({ authenticatedPage, request }) => {
    // Create a public wiki
    const testWiki = generateTestWiki('public-to-private', { isPublic: true })

    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const response = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: testWiki,
    })

    expect(response.ok()).toBeTruthy()

    // Navigate to wiki and verify it's public
    await authenticatedPage.goto(`/wiki/${testWiki.slug}`)
    await authenticatedPage.waitForSelector('[data-testid="wiki-content"]', { timeout: 10000 })

    let privacyStatus = authenticatedPage.locator('[data-testid="privacy-status"]')
    await expect(privacyStatus).toHaveText('Public')

    // Enter manage mode
    const manageButton = authenticatedPage.locator('button:has-text("Manage")')
    await expect(manageButton).toBeVisible()
    await manageButton.click()
    await authenticatedPage.waitForTimeout(500)

    // Click privacy toggle to make private
    const privacyToggle = authenticatedPage.locator('[data-testid="privacy-toggle"]')
    await expect(privacyToggle).toBeVisible()
    await privacyToggle.click()

    // Handle confirmation dialog
    await authenticatedPage.waitForSelector('[data-testid="confirm-privacy-dialog"]', { timeout: 5000 })
    const confirmButton = authenticatedPage.locator('[data-testid="confirm-private-button"]')
    await expect(confirmButton).toBeVisible()
    await confirmButton.click()

    // Wait for success message
    await authenticatedPage.waitForSelector('[data-testid="privacy-success-toast"]', { timeout: 10000 })

    // Verify wiki is now private
    privacyStatus = authenticatedPage.locator('[data-testid="privacy-status"]')
    await expect(privacyStatus).toHaveText('Private')

    // Cleanup
    await prisma.wiki.delete({ where: { slug: testWiki.slug } })
  })

  test('should prevent unauthorized access to private wikis', async ({ page, authenticatedPage, request }) => {
    // Create a private wiki with authenticated user
    const testWiki = generateTestWiki('unauthorized-test')

    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const response = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: testWiki,
    })

    expect(response.ok()).toBeTruthy()

    // Try to access private wiki without authentication (new page context)
    const newContext = await page.context().browser()?.newContext()
    if (!newContext) throw new Error('Could not create new browser context')

    const newPage = await newContext.newPage()

    try {
      // Attempt to access private wiki without authentication
      await newPage.goto(`/wiki/${testWiki.slug}`)

      // Should be redirected or see access denied message
      await newPage.waitForSelector('[data-testid="access-denied"]', { timeout: 10000 })
      const accessDeniedMessage = newPage.locator('[data-testid="access-denied"]')
      await expect(accessDeniedMessage).toBeVisible()
      await expect(accessDeniedMessage).toContainText('Access Denied')
    } finally {
      await newContext.close()
    }

    // Cleanup
    await prisma.wiki.delete({ where: { slug: testWiki.slug } })
  })

  test('should allow public access to public wikis', async ({ page, authenticatedPage, request }) => {
    // Create a public wiki with authenticated user
    const testWiki = generateTestWiki('public-access-test', { isPublic: true })

    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    const response = await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: testWiki,
    })

    expect(response.ok()).toBeTruthy()

    // Access public wiki without authentication (new page context)
    const newContext = await page.context().browser()?.newContext()
    if (!newContext) throw new Error('Could not create new browser context')

    const newPage = await newContext.newPage()

    try {
      // Should be able to access public wiki without authentication
      await newPage.goto(`/wiki/${testWiki.slug}`)

      // Should see wiki content, not access denied
      await newPage.waitForSelector('[data-testid="wiki-content"]', { timeout: 10000 })

      // Should see public indicator
      const publicIndicator = newPage.locator('[data-testid="privacy-indicator"]')
      await expect(publicIndicator).toBeVisible()
      await expect(publicIndicator).toContainText('Public')

      // Should NOT see manage controls (not authenticated)
      const manageButton = newPage.locator('button:has-text("Manage")')
      await expect(manageButton).not.toBeVisible()

      // Should NOT see privacy toggle (not owner)
      const privacyToggle = newPage.locator('[data-testid="privacy-toggle"]')
      await expect(privacyToggle).not.toBeVisible()
    } finally {
      await newContext.close()
    }

    // Cleanup
    await prisma.wiki.delete({ where: { slug: testWiki.slug } })
  })

  test('should display privacy indicators in wiki list', async ({ authenticatedPage, request }) => {
    // Create both private and public wikis
    const privateWiki = generateTestWiki('private-wiki-list', { isPublic: false })
    const publicWiki = generateTestWiki('public-wiki-list', { isPublic: true })

    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    // Create private wiki
    await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: privateWiki,
    })

    // Create public wiki
    await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: publicWiki,
    })

    // Navigate to wiki list
    await authenticatedPage.goto('/wiki')
    await authenticatedPage.waitForSelector('[data-testid="wiki-list"]', { timeout: 10000 })

    // Find and verify private wiki indicator
    const privateWikiCard = authenticatedPage.locator(`[data-testid="wiki-card-${privateWiki.slug}"]`)
    await expect(privateWikiCard).toBeVisible()

    const privateIndicator = privateWikiCard.locator('[data-testid="wiki-privacy-indicator"]')
    await expect(privateIndicator).toBeVisible()
    await expect(privateIndicator).toContainText('Private')

    // Find and verify public wiki indicator
    const publicWikiCard = authenticatedPage.locator(`[data-testid="wiki-card-${publicWiki.slug}"]`)
    await expect(publicWikiCard).toBeVisible()

    const publicIndicator = publicWikiCard.locator('[data-testid="wiki-privacy-indicator"]')
    await expect(publicIndicator).toBeVisible()
    await expect(publicIndicator).toContainText('Public')

    // Cleanup
    await prisma.wiki.delete({ where: { slug: privateWiki.slug } })
    await prisma.wiki.delete({ where: { slug: publicWiki.slug } })
  })

  test('should filter private wikis for unauthenticated users in API', async ({ page, authenticatedPage, request }) => {
    // Create private and public wikis
    const privateWiki = generateTestWiki('api-private-filter', { isPublic: false })
    const publicWiki = generateTestWiki('api-public-filter', { isPublic: true })

    const cookies = await authenticatedPage.context().cookies()
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

    // Create wikis
    await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: privateWiki,
    })

    await request.post('http://localhost:3000/api/test-helper/create-wiki', {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      data: publicWiki,
    })

    // Test API response without authentication
    const unauthenticatedResponse = await request.get('http://localhost:3000/api/wiki/list')
    expect(unauthenticatedResponse.ok()).toBeTruthy()

    const unauthenticatedData = await unauthenticatedResponse.json()

    // Should only contain public wikis
    const publicWikiIds = unauthenticatedData.wikis.map((wiki: any) => wiki.slug)
    expect(publicWikiIds).toContain(publicWiki.slug)
    expect(publicWikiIds).not.toContain(privateWiki.slug)

    // Test API response with authentication
    const authenticatedResponse = await request.get('http://localhost:3000/api/wiki/list', {
      headers: { Cookie: cookieHeader }
    })
    expect(authenticatedResponse.ok()).toBeTruthy()

    const authenticatedData = await authenticatedResponse.json()

    // Should contain both private and public wikis
    const allWikiIds = authenticatedData.wikis.map((wiki: any) => wiki.slug)
    expect(allWikiIds).toContain(publicWiki.slug)
    expect(allWikiIds).toContain(privateWiki.slug)

    // Cleanup
    await prisma.wiki.delete({ where: { slug: privateWiki.slug } })
    await prisma.wiki.delete({ where: { slug: publicWiki.slug } })
  })
})