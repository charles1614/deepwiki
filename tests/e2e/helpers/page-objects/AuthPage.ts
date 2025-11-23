import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object Model for Authentication pages
 */
export class AuthPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly confirmPasswordInput: Locator
  readonly loginButton: Locator
  readonly registerButton: Locator
  readonly resetPasswordButton: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.locator('[data-testid=email]')
    this.passwordInput = page.locator('[data-testid=password]')
    this.confirmPasswordInput = page.locator('[data-testid=confirmPassword]')
    this.loginButton = page.locator('[data-testid=login-button]')
    this.registerButton = page.locator('[data-testid=register-button]')
    this.resetPasswordButton = page.locator('[data-testid=reset-password-button]')
  }

  /**
   * Navigate to login page
   */
  async gotoLogin(): Promise<void> {
    await this.page.goto('/login')
    await this.waitForLoad()
  }

  /**
   * Navigate to register page
   */
  async gotoRegister(): Promise<void> {
    await this.page.goto('/register')
    await this.waitForLoad()
  }

  /**
   * Navigate to reset password page
   */
  async gotoResetPassword(): Promise<void> {
    await this.page.goto('/reset-password')
    await this.waitForLoad()
  }

  /**
   * Wait for page to load
   */
  async waitForLoad(): Promise<void> {
    await expect(this.emailInput).toBeVisible({ timeout: 10000 })
  }

  /**
   * Fill login form
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
  }

  /**
   * Fill register form
   */
  async fillRegisterForm(
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    const isVisible = await this.confirmPasswordInput.isVisible().catch(() => false)
    if (isVisible) {
      await this.confirmPasswordInput.fill(confirmPassword || password)
    }
  }

  /**
   * Submit login form
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillLoginForm(email, password)
    await this.loginButton.click()
    await this.page.waitForURL(/\/(dashboard|wiki)/, { timeout: 10000 })
  }

  /**
   * Submit register form
   */
  async register(
    email: string,
    password: string,
    confirmPassword?: string
  ): Promise<void> {
    await this.fillRegisterForm(email, password, confirmPassword)
    await this.registerButton.click()
    await expect(
      this.page.locator('text=/Account created successfully/i')
    ).toBeVisible({ timeout: 10000 })
  }

  /**
   * Check for error message
   */
  async hasError(message?: string): Promise<boolean> {
    const errorLocator = message
      ? this.page.locator(`text=/${message}/i`)
      : this.page.locator('.text-red-700, [role=alert]')
    
    return await errorLocator.isVisible().catch(() => false)
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    const errorLocator = this.page.locator('.text-red-700, [role=alert]')
    if (await errorLocator.isVisible().catch(() => false)) {
      return await errorLocator.textContent()
    }
    return null
  }
}

