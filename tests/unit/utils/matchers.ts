/**
 * Custom Jest matchers for common test assertions
 * These matchers make tests more readable and maintainable
 */

/**
 * Custom matcher to check if an element has a specific class
 * More flexible than checking exact class strings
 */
expect.extend({
  toHaveClassContaining(received: HTMLElement, className: string) {
    const pass = received.classList.contains(className)
    return {
      message: () =>
        `expected element ${pass ? 'not ' : ''}to have class containing "${className}"`,
      pass,
    }
  },
})

/**
 * Custom matcher to check if an element has any of the specified classes
 */
expect.extend({
  toHaveAnyClass(received: HTMLElement, ...classNames: string[]) {
    const hasAnyClass = classNames.some((className) =>
      received.classList.contains(className)
    )
    return {
      message: () =>
        `expected element ${hasAnyClass ? 'not ' : ''}to have any of classes: ${classNames.join(', ')}`,
      pass: hasAnyClass,
    }
  },
})

/**
 * Custom matcher to check if a number is within a range
 */
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    return {
      message: () =>
        `expected ${received} ${pass ? 'not ' : ''}to be within range ${floor} - ${ceiling}`,
      pass,
    }
  },
})

/**
 * Custom matcher to check if a date is recent (within last N seconds)
 */
expect.extend({
  toBeRecentDate(received: Date, secondsAgo: number = 5) {
    const now = new Date()
    const diff = (now.getTime() - received.getTime()) / 1000
    const pass = diff >= 0 && diff <= secondsAgo
    return {
      message: () =>
        `expected date ${received.toISOString()} ${pass ? 'not ' : ''}to be within last ${secondsAgo} seconds`,
      pass,
    }
  },
})

/**
 * Custom matcher to check if an object has required properties
 */
expect.extend({
  toHaveRequiredProperties(received: object, ...properties: string[]) {
    const missing = properties.filter((prop) => !(prop in received))
    const pass = missing.length === 0
    return {
      message: () =>
        `expected object ${pass ? 'not ' : ''}to have properties: ${properties.join(', ')}. Missing: ${missing.join(', ')}`,
      pass,
    }
  },
})

// TypeScript declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveClassContaining(className: string): R
      toHaveAnyClass(...classNames: string[]): R
      toBeWithinRange(floor: number, ceiling: number): R
      toBeRecentDate(secondsAgo?: number): R
      toHaveRequiredProperties(...properties: string[]): R
    }
  }
}

export {}

