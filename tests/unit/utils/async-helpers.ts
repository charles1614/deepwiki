import { waitFor, waitForOptions } from '@testing-library/react'

/**
 * Utilities for handling async operations reliably in tests
 * These helpers eliminate flaky tests by using proper wait patterns
 */

/**
 * Wait for a condition to be true with exponential backoff
 * More reliable than fixed timeouts
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number
    interval?: number
    onTimeout?: () => void
  } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100, onTimeout } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition()
      if (result) {
        return
      }
    } catch (error) {
      // Continue waiting if condition throws
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  if (onTimeout) {
    onTimeout()
  }
  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Wait for an element to appear and be stable (not changing)
 * Useful for waiting for animations or dynamic content
 */
export async function waitForStable(
  queryFn: () => HTMLElement | null,
  stabilityDuration: number = 200,
  timeout: number = 5000
): Promise<HTMLElement> {
  let lastElement: HTMLElement | null = null
  let stableStartTime: number | null = null

  return new Promise((resolve, reject) => {
    const startTime = Date.now()

    const check = () => {
      const element = queryFn()

      if (!element) {
        if (Date.now() - startTime > timeout) {
          reject(new Error('Element not found within timeout'))
          return
        }
        setTimeout(check, 50)
        return
      }

      // Check if element is the same and stable
      if (element === lastElement) {
        if (stableStartTime === null) {
          stableStartTime = Date.now()
        } else if (Date.now() - stableStartTime >= stabilityDuration) {
          resolve(element)
          return
        }
      } else {
        lastElement = element
        stableStartTime = null
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('Element not stable within timeout'))
        return
      }

      setTimeout(check, 50)
    }

    check()
  })
}

/**
 * Wait for multiple conditions to be true
 * Useful when waiting for multiple async operations
 */
export async function waitForAll(
  conditions: Array<() => boolean | Promise<boolean>>,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 5000 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const results = await Promise.all(
      conditions.map((condition) => Promise.resolve(condition()).catch(() => false))
    )

    if (results.every((result) => result === true)) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error('Not all conditions met within timeout')
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
    backoffFactor?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 1000,
    backoffFactor = 2,
    onRetry,
  } = options

  let lastError: Error | null = null
  let delay = initialDelay

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError)
        }
        await new Promise((resolve) => setTimeout(resolve, delay))
        delay = Math.min(delay * backoffFactor, maxDelay)
      }
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * Wait for network requests to complete
 * Useful for E2E tests or integration tests
 */
export async function waitForNetworkIdle(
  timeout: number = 5000,
  idleTime: number = 500
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    let lastActivityTime = Date.now()

    const checkIdle = () => {
      const now = Date.now()

      // Check if we've been idle long enough
      if (now - lastActivityTime >= idleTime) {
        resolve()
        return
      }

      // Check if we've exceeded timeout
      if (now - startTime >= timeout) {
        reject(new Error('Network did not become idle within timeout'))
        return
      }

      // Check for pending requests (if in browser environment)
      if (typeof window !== 'undefined' && 'performance' in window) {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
        const pending = entries.some(
          (entry) => entry.responseEnd === 0 && entry.transferSize === 0
        )

        if (pending) {
          lastActivityTime = now
        }
      }

      setTimeout(checkIdle, 100)
    }

    checkIdle()
  })
}

/**
 * Wait for a value to change from its initial value
 * Useful for testing state updates
 */
export async function waitForValueChange<T>(
  getValue: () => T | Promise<T>,
  initialValue: T,
  options: { timeout?: number; interval?: number } = {}
): Promise<T> {
  const { timeout = 5000, interval = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const currentValue = await Promise.resolve(getValue())

    if (currentValue !== initialValue) {
      return currentValue
    }

    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error('Value did not change within timeout')
}

/**
 * Helper to wait for element with better error messages
 */
export async function waitForElement<T extends HTMLElement>(
  queryFn: () => T | null,
  options: waitForOptions = {}
): Promise<T> {
  return waitFor(
    () => {
      const element = queryFn()
      if (!element) {
        throw new Error('Element not found')
      }
      return element
    },
    {
      timeout: 5000,
      ...options,
    }
  )
}

