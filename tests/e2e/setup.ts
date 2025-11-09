import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright global setup...')

  // Set up any global polyfills if needed
  if (typeof globalThis.TransformStream === 'undefined') {
    console.log('📝 Adding TransformStream polyfill...')
    // TransformStream should be available in modern Node.js, but if not,
    // the test environment will handle it
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Optionally, you can set up global authentication state here
  // await page.goto('http://localhost:3000/login')
  // ... login logic if needed for all tests

  await browser.close()
  console.log('✅ Playwright global setup completed')
}

export default globalSetup


