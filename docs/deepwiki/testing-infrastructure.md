# Testing Infrastructure

[← Back to Index](index.md)

**Part of**: DeepWiki Architecture Documentation
**Generated**: 19 November 2025
**Source commit**: 2be6259

---

## Testing Infrastructure Overview

DeepWiki implements a **comprehensive multi-layered testing strategy** combining **unit tests**, **integration tests**, and **end-to-end tests** to ensure code quality, functionality, and user experience. The testing infrastructure is built on modern testing tools with **high coverage**, **reliable test execution**, and **automated CI/CD integration**.

### Testing Philosophy

- **Test Pyramid**: More unit tests than integration, more integration than E2E
- **Fast Feedback**: Quick-running unit tests for immediate validation
- **Confidence Building**: Comprehensive E2E tests for user journey validation
- **Maintainable Tests**: Tests that are easy to understand and maintain
- **Performance Conscious**: Tests that run efficiently and reliably

### Technology Stack

- **Jest 30.2.0**: Unit and integration testing framework
- **@testing-library/react 16.3.0**: React component testing utilities
- **@testing-library/jest-dom 6.9.1**: Custom Jest matchers for DOM testing
- **@testing-library/user-event 14.6.1**: User interaction simulation
- **@playwright/test 1.56.1**: End-to-end testing framework
- **jest-environment-jsdom 30.2.0**: DOM environment for Jest

---

## Test Structure

### Test Directory Organization

```
__tests__/                    # Unit and integration tests
├── app/                      # App component tests
│   └── dashboard/
│       └── page.test.tsx
├── components/               # Component tests
│   ├── ui/
│   │   └── Button.test.tsx
│   └── auth/
│       └── LoginForm.test.tsx
├── lib/                      # Utility and library tests
│   ├── auth.test.ts
│   ├── database.test.ts
│   └── validations.test.ts
└── models/                   # Data model tests
    ├── wiki.test.ts
    ├── wiki-file.test.ts
    └── wiki-version.test.ts

tests/e2e/                    # End-to-end tests
├── auth.spec.ts              # Authentication flows
├── wiki.spec.ts              # Wiki management
├── wiki-upload.spec.ts       # File upload
├── wiki-search.spec.ts       # Search functionality
├── wiki-markdown.spec.ts     # Markdown rendering
├── wiki-management.spec.ts   # CRUD operations
├── wiki-ui-improvements.spec.ts
├── wiki-ui-symbol-fixes.spec.ts
├── mermaid-zoom-enhancement.spec.ts
└── navigation.spec.ts        # Navigation tests
```

### Test Configuration

**Jest Configuration**: `jest.config.js:1-30`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    // Handle module aliases (if using)
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!components/**/*.d.ts',
    '!lib/**/*.d.ts',
    '!app/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  transformIgnorePatterns: [
    '/node_modules/',
    '^.+\\.module\\.(css|sass|scss)$',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

**Playwright Configuration**: `playwright.config.ts:1-40`

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
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
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Unit Testing

### Component Testing

**File**: `__tests__/components/ui/Button.test.tsx:1-50`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button'

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center')
    expect(button).not.toBeDisabled()
  })

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button>Default</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600', 'text-white')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button')).toHaveClass('border', 'border-gray-300')
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="default">Default Size</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-10', 'px-4', 'py-2')

    rerender(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-9', 'px-3')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button')).toHaveClass('h-11', 'px-8')
  })

  it('shows loading state correctly', () => {
    render(<Button loading>Loading Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
    // Check for loading indicator (spinner)
    expect(button.querySelector('.spinner')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('forwards additional props', () => {
    render(
      <Button
        data-testid="custom-button"
        aria-label="Custom button"
        disabled
      >
        Custom
      </Button>
    )
    const button = screen.getByTestId('custom-button')
    expect(button).toHaveAttribute('aria-label', 'Custom button')
    expect(button).toBeDisabled()
  })

  it('handles focus and keyboard events', async () => {
    const handleClick = jest.fn()
    const user = userEvent.setup()
    render(<Button onClick={handleClick}>Focusable</Button>)

    // Tab to focus the button
    await user.tab()
    expect(screen.getByRole('button')).toHaveFocus()

    // Press Enter
    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)

    // Press Space
    await user.keyboard(' ')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })
})
```

### Authentication Component Testing

**File**: `__tests__/components/auth/LoginForm.test.tsx:1-80`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from 'next-auth/react'
import { LoginForm } from '@/components/auth/LoginForm'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated'
  }),
  signIn: jest.fn(),
}))

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <SessionProvider>
      {component}
    </SessionProvider>
  )
}

describe('LoginForm Component', () => {
  it('renders all form fields', () => {
    renderWithProviders(<LoginForm />)

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows validation errors for empty fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('handles successful login', async () => {
    const mockSignIn = jest.fn()
    const { signIn } = require('next-auth/react')
    signIn.mockImplementation(mockSignIn)

    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      })
    })
  })

  it('handles login error', async () => {
    const mockSignIn = jest.fn()
    const { signIn } = require('next-auth/react')
    signIn.mockImplementation(() => Promise.resolve({ error: 'Invalid credentials' }))

    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const mockSignIn = jest.fn()
    const { signIn } = require('next-auth/react')
    signIn.mockImplementation(() => new Promise(() => {})) // Never resolves

    const user = userEvent.setup()
    renderWithProviders(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('button')).toHaveTextContent(/signing in/i)
  })
})
```

### Page Testing

**File**: `__tests__/app/dashboard/page.test.tsx:1-50`

```typescript
import { render, screen } from '@testing-library/react'
import { SessionProvider } from 'next-auth/react'
import Dashboard from '@/app/dashboard/page'

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        email: 'test@example.com',
        role: 'USER'
      }
    },
    status: 'authenticated'
  })
}))

// Mock components
jest.mock('@/components/layout/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

jest.mock('@/components/DashboardStats', () => ({
  DashboardStats: () => <div data-testid="dashboard-stats">Dashboard Stats</div>,
}))

jest.mock('@/components/DashboardActivityFeed', () => ({
  DashboardActivityFeed: () => <div data-testid="activity-feed">Activity Feed</div>,
}))

describe('Dashboard Page', () => {
  it('renders dashboard layout', () => {
    render(
      <SessionProvider>
        <Dashboard />
      </SessionProvider>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Welcome to your DeepWiki dashboard')).toBeInTheDocument()
  })

  it('renders dashboard components', () => {
    render(
      <SessionProvider>
        <Dashboard />
      </SessionProvider>
    )

    expect(screen.getByTestId('dashboard-stats')).toBeInTheDocument()
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument()
  })
})
```

### Library Testing

**File**: `__tests__/lib/validations.test.ts:1-50`

```typescript
import { loginSchema, registerSchema } from '@/lib/validations'

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('validates valid login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = loginSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validData)
      }
    })

    it('rejects invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123'
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address')
      }
    })

    it('rejects empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: ''
      }

      const result = loginSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required')
      }
    })
  })

  describe('registerSchema', () => {
    it('validates valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      }

      const result = registerSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects weak password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must be at least 8 characters')
      }
    })

    it('rejects mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Different123'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords don't match")
      }
    })

    it('rejects password without uppercase', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123'
      }

      const result = registerSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password must contain uppercase, lowercase, and number')
      }
    })
  })
})
```

---

## End-to-End Testing

### Authentication Flow Testing

**File**: `tests/e2e/auth.spec.ts:1-80`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test user
    await page.goto('/register')
    await page.fill('[name="email"]', 'e2e-test@example.com')
    await page.fill('[name="password"]', 'TestPassword123')
    await page.fill('[name="confirmPassword"]', 'TestPassword123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/login')
  })

  test('user can register successfully', async ({ page }) => {
    await page.goto('/register')

    // Fill registration form
    await page.fill('[name="email"]', 'newuser@example.com')
    await page.fill('[name="password"]', 'NewPassword123')
    await page.fill('[name="confirmPassword"]', 'NewPassword123')
    await page.click('button[type="submit"]')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
    await expect(page).toContainText('Please sign in to your account')
  })

  test('user can login with valid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('[name="email"]', 'e2e-test@example.com')
    await page.fill('[name="password"]', 'TestPassword123')
    await page.click('button[type="submit"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page).toContainText('Welcome to your DeepWiki dashboard')
  })

  test('user cannot login with invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill with wrong password
    await page.fill('[name="email"]', 'e2e-test@example.com')
    await page.fill('[name="password"]', 'WrongPassword')
    await page.click('button[type="submit"]')

    // Should show error
    await expect(page).toContainText('Invalid email or password')
    await expect(page).toHaveURL('/login')
  })

  test('protected routes redirect to login', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('user can logout', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[name="email"]', 'e2e-test@example.com')
    await page.fill('[name="password"]', 'TestPassword123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')

    // Logout
    await page.click('[data-testid="logout-button"]')
    await expect(page).toHaveURL('/login')
  })

  test('login form validation', async ({ page }) => {
    await page.goto('/login')

    // Try to submit empty form
    await page.click('button[type="submit"]')
    await expect(page).toContainText('Email is required')
    await expect(page).toContainText('Password is required')

    // Test email validation
    await page.fill('[name="email"]', 'invalid-email')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toContainText('Invalid email address')
  })

  test('registration form validation', async ({ page }) => {
    await page.goto('/register')

    // Try to submit with mismatched passwords
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'Password123')
    await page.fill('[name="confirmPassword"]', 'Different123')
    await page.click('button[type="submit"]')
    await expect(page).toContainText("Passwords don't match")

    // Test weak password
    await page.fill('[name="password"]', 'weak')
    await page.fill('[name="confirmPassword"]', 'weak')
    await page.click('button[type="submit"]')
    await expect(page).toContainText('Password must be at least 8 characters')
  })
})
```

### Wiki Management Testing

**File**: `tests/e2e/wiki.spec.ts:1-80`

```typescript
import { test, expect } from '@playwright/test'
import fs from 'fs/promises'

test.describe('Wiki Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can view wikis list', async ({ page }) => {
    await page.goto('/wiki')

    // Should show wikis list
    await expect(page).toContainText('Wikis')
    await expect(page.locator('.wiki-card')).toHaveCount(5) // Assuming 5 test wikis
  })

  test('user can open a wiki', async ({ page }) => {
    await page.goto('/wiki')

    // Click on first wiki
    await page.click('.wiki-card >> nth=0')

    // Should navigate to wiki page
    await expect(page).toHaveURL(/\/wiki\/.*$/)
    await expect(page).toHaveSelector('h1')

    // Should show wiki content
    await expect(page.locator('.prose')).toBeVisible()
  })

  test('user can search wikis', async ({ page }) => {
    await page.goto('/wiki')

    // Search for a specific wiki
    await page.fill('[name="q"]', 'docker')
    await page.press('[name="q"]', 'Enter')

    // Should show search results
    await expect(page.locator('.search-results')).toBeVisible()
    await expect(page.locator('.search-result')).toHaveCount(2) // Assuming 2 docker wikis
  })

  test('wiki navigation works', async ({ page }) => {
    await page.goto('/wiki/docker-guide')

    // Should show multiple files
    const fileTabs = page.locator('[data-testid="file-tab"]')
    await expect(fileTabs).toHaveCount(3) // Assuming 3 files

    // Click on different file
    await page.click('[data-testid="file-tab"] >> nth=1')

    // Should update content
    await expect(page.locator('.prose')).toContainText('Different content')

    // Check URL updates
    await expect(page).toHaveURL(/\/wiki\/docker-guide\?file=.*$/)
  })

  test('user can navigate between wikis', async ({ page }) => {
    // Start on one wiki
    await page.goto('/wiki/docker-guide')
    await expect(page).toContainText('Docker Guide')

    // Navigate to another wiki
    await page.goto('/wiki/kubernetes-setup')
    await expect(page).toContainText('Kubernetes Setup')

    // Verify URL change
    await expect(page).toHaveURL('/wiki/kubernetes-setup')
  })
})
```

### File Upload Testing

**File**: `tests/e2e/wiki-upload.spec.ts:1-80`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Wiki Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can upload single wiki file', async ({ page }) => {
    await page.goto('/upload')

    // Fill form
    await page.fill('[name="title"]', 'Test Wiki')
    await page.fill('[name="description"]', 'A test wiki')

    // Upload file
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test-wiki.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Test Wiki\n\nThis is a test wiki.')
    })

    await page.click('button[type="submit"]')

    // Should redirect to wiki page
    await expect(page).toHaveURL(/\/wiki\/test-wiki$/)
    await expect(page).toContainText('Test Wiki')
    await expect(page).toContainText('This is a test wiki.')
  })

  test('user can upload multiple wiki files', async ({ page }) => {
    await page.goto('/upload')

    // Fill form
    await page.fill('[name="title"]', 'Multi-file Wiki')
    await page.fill('[name="description"]', 'Wiki with multiple files')

    // Upload multiple files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      {
        name: 'readme.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Readme\n\nMain documentation.')
      },
      {
        name: 'setup.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Setup\n\nInstallation guide.')
      },
      {
        name: 'usage.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Usage\n\nHow to use.')
      }
    ])

    await page.click('button[type="submit"]')

    // Should redirect to wiki page with multiple files
    await expect(page).toHaveURL(/\/wiki\/multi-file-wiki$/)
    await expect(page).toContainText('Multi-file Wiki')

    // Check file tabs
    const fileTabs = page.locator('[data-testid="file-tab"]')
    await expect(fileTabs).toHaveCount(3)

    // Switch between files
    await page.click('[data-testid="file-tab"] >> nth=1')
    await expect(page.locator('.prose')).toContainText('Installation guide')
  })

  test('upload progress indicator', async ({ page }) => {
    await page.goto('/upload')

    // Create a large file to trigger progress
    const largeContent = '# Large Wiki\n\n' + 'x'.repeat(10000)
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'large-wiki.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from(largeContent)
    })

    // Fill required fields
    await page.fill('[name="title"]', 'Large Wiki')

    // Monitor progress indicator
    const progressBar = page.locator('[data-testid="upload-progress"]')
    await page.click('button[type="submit"]')

    // Progress should be visible during upload
    await expect(progressBar).toBeVisible()
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100')
  })

  test('upload validation', async ({ page }) => {
    await page.goto('/upload')

    // Try to submit without files
    await page.fill('[name="title"]', 'Test')
    await page.fill('[name="description"]', 'Test description')
    await page.click('button[type="submit"]')

    // Should show validation error
    await expect(page).toContainText('Please select at least one file')

    // Try to submit without title
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'test.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Test')
    })

    await page.click('button[type="submit"]')
    await expect(page).toContainText('Title is required')
  })
})
```

### Search Testing

**File**: `tests/e2e/wiki-search.spec.ts:1-50`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can search for wikis', async ({ page }) => {
    await page.goto('/search')

    // Enter search query
    await page.fill('[name="q"]', 'docker')
    await page.click('button[type="submit"]')

    // Wait for results
    await expect(page.locator('.search-results')).toBeVisible()

    // Verify results
    const results = page.locator('.search-result')
    await expect(results).toHaveCount(3) // Assuming 3 docker-related results

    // Check that results contain search term
    const firstResult = results.first()
    await expect(firstResult).toContainText('docker')
  })

  test('search suggestions work', async ({ page }) => {
    await page.goto('/search')

    // Type partial query
    await page.fill('[name="q"]', 'doc')

    // Wait for suggestions
    await page.waitForSelector('.search-suggestions', { timeout: 1000 })

    // Click suggestion
    await page.click('.search-suggestions >> text=docker')

    // Verify search was executed
    await expect(page).toHaveURL(/.*q=docker.*/)
  })

  test('boolean search works', async ({ page }) => {
    await page.goto('/search')

    // Enter boolean query
    await page.fill('[name="q"]', 'docker AND kubernetes')
    await page.click('button[type="submit"]')

    // Verify results
    await expect(page.locator('.search-results')).toBeVisible()

    // Check result count
    const results = page.locator('.search-result')
    await expect(results).toHaveCount(2) // Assuming 2 results with both terms
  })

  test('content search works', async ({ page }) => {
    await page.goto('/search')

    // Enable content search
    await page.check('[name="content"]')

    // Enter search query
    await page.fill('[name="q"]', 'containerization')
    await page.click('button[type="submit"]')

    // Should show results from file content
    await expect(page.locator('.search-results')).toBeVisible()

    // Should show content matches
    const results = page.locator('.search-result')
    await expect(results).toHaveCount(1) // Assuming 1 result with content match
    await expect(results.first()).toContainText('containerization')
  })
})
```

### Markdown Rendering Testing

**File**: `tests/e2e/wiki-markdown.spec.ts:1-60`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to wiki with markdown
    await page.goto('/login')
    await page.fill('[name="email"]', 'user@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.goto('/wiki/markdown-guide')
  })

  test('headings render correctly', async ({ page }) => {
    // Check heading hierarchy
    await expect(page.locator('h1')).toContainText('Markdown Guide')
    await expect(page.locator('h2')).toContainText('Table of Contents')
    await expect(page.locator('h3')).toContainText('Headings')
  })

  test('code blocks render with syntax highlighting', async ({ page }) => {
    // Should show code block with language class
    const codeBlock = page.locator('pre code')
    await expect(codeBlock).toHaveClass(/language-javascript/)
    await expect(codeBlock).toContainText('console.log')

    // Should show line numbers
    const lineNumbers = page.locator('.line-number')
    await expect(lineNumbers.first()).toContainText('1')
  })

  test('lists render correctly', async ({ page }) => {
    // Check unordered list
    await expect(page.locator('ul')).toContainText('First item')
    await expect(page.locator('ul')).toContainText('Second item')

    // Check ordered list
    await expect(page.locator('ol')).toContainText('Step one')
    await expect(page.locator('ol')).toContainText('Step two')
  })

  test('tables render responsively', async ({ page }) => {
    // Check table structure
    await expect(page.locator('table')).toBeVisible()
    await expect(page.locator('th')).toContainText('Name')
    await expect(page.locator('th')).toContainText('Description')
    await expect(page.locator('td')).toContainText('Example')
  })

  test('links render correctly', async ({ page }) => {
    // Check external link
    const externalLink = page.locator('a[href^="http"]').first()
    await expect(externalLink).toContainText('External Link')

    // Check internal link
    const internalLink = page.locator('a[href^="/"]').first()
    await expect(internalLink).toContainText('Internal Link')
  })

  test('images render correctly', async ({ page }) => {
    const images = page.locator('img')
    await expect(images.first()).toHaveAttribute('alt', 'Example image')
    await expect(images.first()).toHaveAttribute('src')

    // Check image is responsive
    const imageContainer = images.first().locator('..')
    await expect(imageContainer).toHaveClass(/overflow-x-auto/)
  })

  test('blockquotes render correctly', async ({ page }) => {
    const blockquote = page.locator('blockquote')
    await expect(blockquote).toContainText('This is a blockquote')
    await expect(blockquote).toHaveClass(/border-l-4/)
  })
})
```

---

## Test Execution

### Test Scripts

**File**: `package.json:13-17`

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test"
  }
}
```

### Running Tests

**Unit Tests**:
```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- wiki.test.ts

# Run tests with pattern
npm test -- --testNamePattern="LoginForm"
```

**E2E Tests**:
```bash
# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test auth.spec.ts

# Run E2E tests in debug mode
npx playwright test --debug

# Run E2E tests in specific browser
npx playwright test --project=chromium

# Run E2E tests with headed browser
npx playwright test --headed
```

### CI/CD Integration

**GitHub Actions** (`.github/workflows/test.yml`):

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linting
      run: npm run lint

    - name: Run type checking
      run: npm run type-check

    - name: Run unit tests
      run: npm run test:coverage

    - name: Start application
      run: npm run dev &
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}

    - name: Wait for application
      run: npx wait-on http://localhost:3000

    - name: Run E2E tests
      run: npx playwright test
      env:
        CI: true

    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

---

## Test Coverage

### Coverage Configuration

**Jest Coverage** (`jest.config.js:20-30`):

```javascript
collectCoverageFrom: [
  'components/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  'app/**/*.{js,jsx,ts,tsx}',
  '!components/**/*.d.ts',
  '!lib/**/*.d.ts',
  '!app/**/*.d.ts',
],
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

### Coverage Reporting

**Unit Test Coverage Goals**:
- **Overall Coverage**: 80% minimum
- **Critical Components**: 90% coverage
- **Business Logic**: 95% coverage
- **API Routes**: 85% coverage
- **UI Components**: 75% coverage

**Coverage Reports**:
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html

# Check specific file coverage
npm run test:coverage -- --coveragePathIgnorePatterns='!components/ui/Button.tsx'
```

**Coverage Tracking**:
- **SonarQube Integration**: Quality gates
- **CodeCov**: Coverage tracking
- **PR Comments**: Coverage changes in pull requests
- **Coverage Badges**: README coverage status

---

## Testing Best Practices

### Unit Testing Best Practices

1. **Test Structure (AAA)**:
   - **Arrange**: Set up test data and mocks
   - **Act**: Execute the function/component being tested
   - **Assert**: Verify the expected behavior

2. **Good Test Practices**:
   - **Test Behavior, Not Implementation**: Focus on what the code does, not how
   - **One Test, One Concept**: Each test should verify one specific behavior
   **Descriptive Test Names**: Test names should clearly describe what's being tested
   - **Arrange-Act-Assert Pattern**: Clear test structure improves readability
   - **Independent Tests**: Tests should not depend on each other
   - **Fast Execution**: Unit tests should run quickly

3. **Component Testing Guidelines**:
   - Test user interactions, not implementation details
   - Use data-testid attributes for reliable element selection
   - Mock external dependencies
   - Test error states and edge cases
   - Verify accessibility attributes

### E2E Testing Best Practices

1. **Test Design Principles**:
   - **User-Centric**: Write tests from the user's perspective
   - **Critical Path Focus**: Test the most important user journeys
   - **Stable Selectors**: Use reliable element selectors
   - **Realistic Data**: Use test data that mimics production

2. **Flake Prevention**:
   - **Wait for Elements**: Use explicit waits instead of timeouts
   - **Retry Logic**: Handle transient failures
   - **Test Isolation**: Clean up test data between tests
   - **Stable Test Data**: Use deterministic test data

3. **Performance Testing**:
   - **Screenshots on Failure**: Automatically capture screenshots
   - **Video Recording**: Record test execution for debugging
   - **Network Monitoring**: Check for slow requests
   - **Memory Leaks**: Monitor for memory issues

### Test Data Management

**Test Factories**:
```typescript
// __tests__/factories/user.ts
import { User, Role } from '@prisma/client'

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'USER' as Role,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// __tests__/factories/wiki.ts
export function createWiki(overrides: Partial<Wiki> = {}): Wiki {
  return {
    id: 'test-wiki-id',
    title: 'Test Wiki',
    slug: 'test-wiki',
    description: 'A test wiki',
    folderName: 'test-wiki-folder',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
```

**Database Seeding for Tests**:
```typescript
// __tests__/setup/test-db.ts
import { prisma } from '@/lib/database'
import { createUser, createWiki } from '../factories'

export async function setupTestDB() {
  // Clean database
  await prisma.wikiVersion.deleteMany()
  await prisma.wikiFile.deleteMany()
  await prisma.wiki.deleteMany()
  await prisma.user.deleteMany()

  // Create test data
  const admin = await prisma.user.create({
    data: createUser({ email: 'admin@test.com', role: 'ADMIN' })
  })

  const user = await prisma.user.create({
    data: createUser({ email: 'user@test.com' })
  })

  const wiki = await prisma.wiki.create({
    data: createWiki({ title: 'Test Wiki' })
  })

  return { admin, user, wiki }
}

export async function cleanupTestDB() {
  // Clean up test data
  await prisma.wikiVersion.deleteMany()
  await prisma.wikiFile.deleteMany()
  await prisma.wiki.deleteMany()
  await prisma.user.deleteMany()
}
```

---

## Test Automation

### Automated Test Execution

**Pre-commit Hooks** (`.husky/pre-commit`):
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:unit
npm run lint
npm run type-check
```

**Pre-push Hooks**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:coverage
npm run test:e2e
```

### Test Reporting

**HTML Reports**:
```bash
# Generate Playwright HTML report
npx playwright show-report

# Generate Jest coverage report
npm run test:coverage
open coverage/lcov-report/index.html
```

**CI/CD Test Reports**:
- **Jest JUnit XML**: For CI systems
- **Playwright HTML**: For browser test results
- **Coverage LCOV**: For code coverage reporting
- **Test Artifacts**: Screenshots and videos

### Performance Testing

**Lighthouse CI**:
```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "startServerCommand": "npm run dev"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.8}],
        "categories:accessibility": ["error", {"minScore": 0.9}],
        "categories:seo": ["error", {"minScore": 0.8}]
      }
    }
  }
}
```

**Web Vitals Testing**:
```typescript
// __tests__/performance/web-vitals.test.ts
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

test('web vitals are within acceptable ranges', async () => {
  const vitals = {
    cls: 0,
    fid: 0,
    fcp: 0,
    lcp: 0,
    ttfb: 0
  }

  // Measure vitals during page load
  getCLS(console.log)
  getFID(console.log)
  getFCP(console.log)
  getLCP(console.log)
  getTTFB(console.log)

  // Assertions (values would come from actual measurements)
  expect(vitals.cls).toBeLessThan(0.1)
  expect(vitals.fid).toBeLessThan(100)
  expect(vitals.lcp).toBeLessThan(2500)
})
```

---

## Debugging Tests

### Jest Debugging

**Debug Specific Test**:
```bash
# Debug specific test file
npm test -- wiki.test.ts --detectOpenHandles

# Debug with verbose output
npm test -- --verbose wiki.test.ts

# Run tests without caching
npm test -- --no-cache wiki.test.ts
```

**VS Code Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Jest Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/jest/bin/jest",
      "args": ["--runInBand", "--no-cache", "${workspaceFolder}/__tests__}/components/ui/Button.test.tsx"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Playwright Debugging

**Debug E2E Tests**:
```bash
# Run with debugger
npx playwright test --debug

# Run with browser visible
npx playwright test --headed

# Run specific test with debug
npx playwright test auth.spec.ts --debug
```

**Test Isolation**:
```typescript
test('isolated test', async ({ page }) => {
  // Each test runs in fresh browser context
  // No shared state between tests
  await page.goto('/login')
  // Test is isolated
})
```

---

## Continuous Improvement

### Test Metrics

**Key Metrics to Track**:
- **Test Coverage**: Overall and per-component
- **Test Execution Time**: CI pipeline duration
- **Test Flakiness**: Intermittent failures
- **Bug Detection Rate**: Bugs caught by tests vs production
- **Test Maintenance Cost**: Time spent fixing tests

**Metrics Collection**:
```typescript
// Add to test reports
const testMetrics = {
  totalTests: tests.length,
  passedTests: passed.length,
  failedTests: failed.length,
  skippedTests: skipped.length,
  executionTime: duration,
  coverage: {
    lines: 85.2,
    branches: 78.5,
    functions: 88.1,
    statements: 85.0
  }
}
```

### Test Quality Gates

**Pre-merge Requirements**:
- [ ] All unit tests pass
- [ ] E2E tests pass
- [ ] Coverage ≥ 80%
- [ ] No linting errors
- [ ] Type checking passes

**Quality Metrics**:
- **Code Coverage**: ≥ 80%
- **Test Reliability**: ≤ 2% flake rate
- **Test Performance**: ≤ 2 minutes for unit tests
- **E2E Test Duration**: ≤ 10 minutes for full suite

---

**Next**: [Deployment Infrastructure](deployment-infrastructure.md) →
