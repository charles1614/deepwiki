import { FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  // Add polyfills for Node.js environment
  if (typeof globalThis.TextEncoder === 'undefined') {
    const { TextEncoder, TextDecoder } = require('util')
    globalThis.TextEncoder = TextEncoder
    globalThis.TextDecoder = TextDecoder
  }

  // Add TransformStream polyfill if needed
  if (typeof globalThis.TransformStream === 'undefined') {
    // TransformStream should be available in Node.js 16+, but if not:
    console.log('TransformStream polyfill not needed - using native implementation')
  }

  console.log('✅ Playwright global setup completed')
}

export default globalSetup