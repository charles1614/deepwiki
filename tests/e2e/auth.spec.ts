import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session by clearing cookies only
    await page.context().clearCookies()
  })

  test('user can register, login, and access protected content', async ({ page }) => {
    // Generate unique email to avoid conflicts
    const timestamp = Date.now()
    const uniqueEmail = `testuser${timestamp}@example.com`

    // 1. Navigate to registration page
    await page.goto('/register')

    // 2. Fill registration form
    await page.fill('[data-testid=email]', uniqueEmail)
    await page.fill('[data-testid=password]', 'Password123!')
    await page.fill('[data-testid=confirmPassword]', 'Password123!')

    // 3. Submit registration
    await page.click('[data-testid=register-button]')

    // 4. Should be redirected to login or show success
    await expect(page.locator('text=/Account created successfully/i')).toBeVisible({
      timeout: 10000
    })

    // Wait for potential auto-redirect, then navigate to login if needed
    try {
      await page.waitForURL('/dashboard', { timeout: 3000 })
      // If redirected to dashboard, navigate to login for the test
      await page.goto('/login')
    } catch {
      // No redirect happened, continue to login
      await page.goto('/login')
    }

    // 6. Fill login form
    await page.fill('[data-testid=email]', uniqueEmail)
    await page.fill('[data-testid=password]', 'Password123!')

    // 7. Submit login
    await page.click('[data-testid=login-button]')

    // 8. Should be redirected to dashboard
    await expect(page).toHaveURL('/dashboard', {
      timeout: 10000
    })

    // 9. Should see protected content
    await expect(page.locator('[data-testid=welcome-message]')).toBeVisible()
  })

  test('user can login with existing credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login')

    // Fill login form with seeded user
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')

    // Submit login
    await page.click('[data-testid=login-button]')

    // Should be redirected to dashboard
    await expect(page).toHaveURL('http://localhost:3001/dashboard', {
      timeout: 10000
    })

    // Should see protected content
    await expect(page.locator('[data-testid=welcome-message]')).toBeVisible()
  })

  test('shows error for invalid credentials', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login')

    // Fill login form with invalid credentials
    await page.fill('[data-testid=email]', 'invalid@example.com')
    await page.fill('[data-testid=password]', 'wrongpassword')

    // Submit login
    await page.click('[data-testid=login-button]')

    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible({
      timeout: 5000
    })

    // Should stay on login page
    await expect(page).toHaveURL('http://localhost:3001/login')
  })

  test('admin user can login and access admin features', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login')

    // Fill login form with admin credentials
    await page.fill('[data-testid=email]', 'admin@deepwiki.com')
    await page.fill('[data-testid=password]', 'Admin123!')

    // Submit login
    await page.click('[data-testid=login-button]')

    // Should be redirected to dashboard
    await expect(page).toHaveURL('http://localhost:3001/dashboard', {
      timeout: 10000
    })

    // Should see admin-specific content
    await expect(page.locator('[data-testid=admin-panel]')).toBeVisible()
  })

  test('form validation works correctly', async ({ page }) => {
    // Navigate to registration page
    await page.goto('http://localhost:3001/register')

    // Try to submit empty form
    await page.click('[data-testid="register-button"]')

    // Should show validation errors
    await expect(page.locator('text=Invalid email address')).toBeVisible()
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()

    // Fill with weak password
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'weakpassword')
    await page.fill('[data-testid="confirmPassword"]', 'weakpassword')

    await page.click('[data-testid="register-button"]')

    // Should show password strength error
    await expect(page.locator('text=Password must contain uppercase, lowercase, and number')).toBeVisible()
  })

  test('password reset flow works', async ({ page }) => {
    // Navigate to password reset page
    await page.goto('http://localhost:3001/reset-password')

    // Fill reset form
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.click('[data-testid=reset-button]')

    // Should show success message
    await expect(page.locator('text=Password reset email sent! Check your email for instructions.')).toBeVisible({
      timeout: 5000
    })

    // Should show back to login link
    await expect(page.locator('[data-testid=back-to-login]')).toBeVisible()
  })

  test('unauthenticated user cannot access protected routes', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('http://localhost:3001/dashboard')

    // Should be redirected to login
    await expect(page).toHaveURL('http://localhost:3001/login', {
      timeout: 5000
    })
  })

  test('keyboard navigation works correctly', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:3001/login')

    // Focus the email input directly first, then test tab navigation
    await page.locator('[data-testid=email]').focus()
    await expect(page.locator('[data-testid=email]')).toBeFocused()

    await page.keyboard.press('Tab') // Should focus password field
    await expect(page.locator('[data-testid=password]')).toBeFocused()

    await page.keyboard.press('Tab') // Should focus submit button
    await expect(page.locator('[data-testid=login-button]')).toBeFocused()

    // Should be able to submit with Enter
    await page.fill('[data-testid=email]', 'user@deepwiki.com')
    await page.fill('[data-testid=password]', 'User123!')
    await page.keyboard.press('Enter')

    // Should process login
    await expect(page).toHaveURL('http://localhost:3001/dashboard', {
      timeout: 10000
    })
  })
})

test.describe('Accessibility', () => {
  test('login form is accessible', async ({ page }) => {
    await page.goto('http://localhost:3001/login')

    // Check for proper landmarks and labels
    await expect(page.locator('h2:has-text("Sign in to your account")')).toBeVisible()
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()

    // Check for proper ARIA attributes
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'false')

    const passwordInput = page.locator('input[type="password"]')
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'false')

    // Check button accessibility
    const submitButton = page.locator('button[type="submit"]')
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toHaveText(/sign in/i)
  })

  test('registration form is accessible', async ({ page }) => {
    await page.goto('http://localhost:3001/register')

    // Check for proper landmarks and labels
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible()
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
    await expect(page.locator('label[for="confirmPassword"]')).toBeVisible()

    // Check for proper form structure
    const emailInput = page.locator('input[type="email"]')
    await expect(emailInput).toHaveAttribute('autocomplete', 'email')

    const passwordInputs = page.locator('input[type="password"]')
    await expect(passwordInputs).toHaveCount(2)
    await expect(passwordInputs.first()).toHaveAttribute('autocomplete', 'new-password')
    await expect(passwordInputs.last()).toHaveAttribute('autocomplete', 'new-password')
  })
})