import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Run tests in parallel - use more workers for faster execution */
  workers: process.env.CI ? 1 : 8, // Use 8 workers in development, 1 in CI for stability
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Global setup to handle polyfills */
  globalSetup: require.resolve('./tests/e2e/setup.ts'),
  
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes timeout for server to start
    env: {
      // Use test database for e2e tests
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://deepwiki:devpassword123@localhost:5432/deepwiki-dev',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-key',
      NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      NODE_ENV: 'test',
      // R2 storage configuration
      CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'deepwiki-dev',
      CLOUDFLARE_R2_ACCOUNT_ID: process.env.CLOUDFLARE_R2_ACCOUNT_ID || '5302b543fe5391a35d30db8e93b3070b',
      CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '962c41de10f480cbf9b9032eb44defba',
      CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '289b191a413ec6d79c498c35519be2e64eb04b89e6cf41cd1ae0f7a2ad613098',
      CLOUDFLARE_R2_ENDPOINT_URL: process.env.CLOUDFLARE_R2_ENDPOINT_URL || 'https://5302b543fe5391a35d30db8e93b3070b.r2.cloudflarestorage.com',
    },
  },
})