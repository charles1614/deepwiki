import { test as base, Page, APIRequestContext } from '@playwright/test'
import { AuthPage } from './page-objects/AuthPage'
import { WikiPage } from './page-objects/WikiPage'
import { DashboardPage } from './page-objects/DashboardPage'
import { generateTestUser, generateTestWiki } from './test-data'
import { clearSession, waitForPageLoad } from './test-helpers'

/**
 * Extended test context with custom fixtures
 */
type TestFixtures = {
  authPage: AuthPage
  wikiPage: WikiPage
  dashboardPage: DashboardPage
  authenticatedPage: Page
  testUser: ReturnType<typeof generateTestUser>
  testWiki: ReturnType<typeof generateTestWiki>
  createTestWiki: (content?: string) => Promise<{ slug: string; fileId?: string }>
}

/**
 * Extend base test with custom fixtures
 */
export const test = base.extend<TestFixtures>({
  /**
   * Auth page object
   */
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page))
  },

  /**
   * Wiki page object
   */
  wikiPage: async ({ page }, use) => {
    await use(new WikiPage(page))
  },

  /**
   * Dashboard page object
   */
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page))
  },

  /**
   * Authenticated page (auto-login)
   */
  authenticatedPage: async ({ page, request }, use) => {
    // Clear any existing session
    await clearSession(page)

    // Generate test user
    const testUser = generateTestUser()

    // Register user
    await page.goto('/register')
    await page.fill('[data-testid=email]', testUser.email)
    await page.fill('[data-testid=password]', testUser.password)
    await page.fill('[data-testid=confirmPassword]', testUser.confirmPassword)
    await page.click('[data-testid=register-button]')

    // Wait for successful registration and auto-redirect to dashboard
    // RegisterForm auto-redirects after 2 seconds, so wait for the redirect
    await page.waitForURL(/\/(dashboard|wiki)/, { timeout: 30000 })

    // Wait for client-side session to be established
    await page.waitForSelector('[data-testid=user-menu]', { timeout: 10000 })

    await use(page)

    // Cleanup
    await clearSession(page)
  },

  /**
   * Test user data
   */
  testUser: async ({ }, use) => {
    const user = generateTestUser()
    await use(user)
  },

  /**
   * Test wiki data
   */
  testWiki: async ({ }, use) => {
    const wiki = generateTestWiki()
    await use(wiki)
  },

  /**
   * Helper to create a test wiki via API
   */
  createTestWiki: async ({ authenticatedPage, request, testWiki }, use) => {
    const createWiki = async (content?: string) => {
      // Get session cookies
      const cookies = await authenticatedPage.context().cookies()
      const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')

      const wikiData = {
        ...testWiki,
        content: content || testWiki.content,
      }

      // Create wiki via test helper API
      const response = await request.post(
        'http://localhost:3000/api/test-helper/create-wiki',
        {
          headers: {
            Cookie: cookieHeader,
            'Content-Type': 'application/json',
          },
          data: wikiData,
        }
      )

      if (!response.ok()) {
        throw new Error(
          `Failed to create test wiki: ${await response.text()}`
        )
      }

      const data = await response.json()
      return {
        slug: data.slug || wikiData.slug,
        fileId: data.files?.[0]?.id,
      }
    }

    await use(createWiki)
  },
})

export { expect } from '@playwright/test'

