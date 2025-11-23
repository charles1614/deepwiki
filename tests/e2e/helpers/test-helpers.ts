import { Page, expect } from '@playwright/test'

/**
 * Common E2E test utilities
 * Provides reliable wait patterns and common operations
 */

/**
 * Wait for element to be visible with better error messages
 */
export async function waitForVisible(
  page: Page,
  selector: string,
  options: { timeout?: number; description?: string } = {}
): Promise<void> {
  const { timeout = 10000, description = selector } = options
  await expect(page.locator(selector)).toBeVisible({ timeout })
}

/**
 * Wait for network to be idle
 * More reliable than waitForTimeout
 */
export async function waitForNetworkIdle(
  page: Page,
  timeout: number = 5000
): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Wait for element to be stable (not changing)
 */
export async function waitForStable(
  page: Page,
  selector: string,
  stabilityDuration: number = 200,
  timeout: number = 5000
): Promise<void> {
  let lastContent: string | null = null
  let stableStartTime: number | null = null
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = page.locator(selector)
    const isVisible = await element.isVisible().catch(() => false)

    if (!isVisible) {
      await page.waitForTimeout(50)
      continue
    }

    const currentContent = await element.textContent().catch(() => null)

    if (currentContent === lastContent) {
      if (stableStartTime === null) {
        stableStartTime = Date.now()
      } else if (Date.now() - stableStartTime >= stabilityDuration) {
        return
      }
    } else {
      lastContent = currentContent
      stableStartTime = null
    }

    await page.waitForTimeout(50)
  }

  throw new Error(`Element ${selector} did not stabilize within ${timeout}ms`)
}

/**
 * Wait for text to appear
 */
export async function waitForText(
  page: Page,
  text: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options
  const locator = typeof text === 'string' 
    ? page.locator(`text=${text}`)
    : page.locator(`text=/${text.source}/`)
  
  await expect(locator.first()).toBeVisible({ timeout })
}

/**
 * Wait for text to disappear
 */
export async function waitForTextGone(
  page: Page,
  text: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options
  const locator = typeof text === 'string'
    ? page.locator(`text=${text}`)
    : page.locator(`text=/${text.source}/`)
  
  await expect(locator).not.toBeVisible({ timeout })
}

/**
 * Retry an operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 1000,
    backoffFactor = 2,
  } = options

  let lastError: Error | null = null
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * backoffFactor, maxDelay)
      }
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * Wait for API request to complete
 */
export async function waitForApiRequest(
  page: Page,
  urlPattern: string | RegExp,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options
  const pattern = typeof urlPattern === 'string' ? urlPattern : urlPattern.source

  await page.waitForResponse(
    (response) => {
      const url = response.url()
      return url.includes(pattern) && response.status() < 400
    },
    { timeout }
  )
}

/**
 * Fill form field with retry
 */
export async function fillFieldWithRetry(
  page: Page,
  selector: string,
  value: string,
  options: { maxAttempts?: number } = {}
): Promise<void> {
  const { maxAttempts = 3 } = options

  await retry(
    async () => {
      const field = page.locator(selector)
      await field.waitFor({ state: 'visible', timeout: 5000 })
      await field.clear()
      await field.fill(value)
      const actualValue = await field.inputValue()
      if (actualValue !== value) {
        throw new Error(`Field value mismatch: expected "${value}", got "${actualValue}"`)
      }
    },
    { maxAttempts }
  )
}

/**
 * Click with retry
 */
export async function clickWithRetry(
  page: Page,
  selector: string,
  options: { maxAttempts?: number; timeout?: number } = {}
): Promise<void> {
  const { maxAttempts = 3, timeout = 5000 } = options

  await retry(
    async () => {
      const element = page.locator(selector)
      await element.waitFor({ state: 'visible', timeout })
      await element.click()
    },
    { maxAttempts }
  )
}

/**
 * Wait for page to be fully loaded
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('body', { timeout: 10000 })
}

/**
 * Clear all cookies and storage
 * Handles cases where localStorage may not be accessible (e.g., before navigation)
 */
export async function clearSession(page: Page): Promise<void> {
  await page.context().clearCookies()
  
  // Only try to clear storage if page has navigated to a valid origin
  const url = page.url()
  if (url && url !== 'about:blank' && !url.startsWith('chrome-extension://')) {
    try {
      await page.evaluate(() => {
        try {
          localStorage.clear()
        } catch (e) {
          // localStorage may not be accessible in some contexts
        }
        try {
          sessionStorage.clear()
        } catch (e) {
          // sessionStorage may not be accessible in some contexts
        }
      })
    } catch (error) {
      // If page.evaluate fails, it's likely the page context isn't ready
      // This is fine - cookies are already cleared
    }
  }
}

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate unique email for testing
 */
export function generateTestEmail(prefix: string = 'testuser'): string {
  return `${prefix}-${Date.now()}@example.com`
}

