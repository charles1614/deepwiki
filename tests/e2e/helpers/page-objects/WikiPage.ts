import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object Model for Wiki pages
 * Encapsulates wiki-related interactions and selectors
 */
export class WikiPage {
  readonly page: Page
  readonly fileList: Locator
  readonly markdownContent: Locator
  readonly editButton: Locator
  readonly saveEditButton: Locator
  readonly cancelEditButton: Locator
  readonly previewToggle: Locator
  readonly contentTextarea: Locator
  readonly manageButton: Locator
  readonly exitManageButton: Locator
  readonly addPageButton: Locator
  readonly privacyToggle: Locator
  readonly privacyStatus: Locator
  readonly privacyIndicator: Locator
  readonly confirmPrivacyDialog: Locator
  readonly privacySuccessToast: Locator
  readonly accessDeniedMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.fileList = page.locator('[data-testid=file-list]')
    this.markdownContent = page.locator('[data-testid=markdown-content]')
    this.editButton = page.locator('[data-testid=edit-button]')
    this.saveEditButton = page.locator('[data-testid=save-edit]')
    this.cancelEditButton = page.locator('[data-testid=cancel-edit]')
    this.previewToggle = page.locator('[data-testid=preview-toggle]')
    this.contentTextarea = page.locator('[data-testid=content-textarea]')
    this.manageButton = page.locator('button:has-text("Manage")')
    this.exitManageButton = page.locator('button:has-text("Exit Manage")')
    this.addPageButton = page.locator('button:has-text("+ Add Page"), button:has-text("Add Page")')

    // Privacy-related selectors
    this.privacyToggle = page.locator('[data-testid=privacy-toggle]')
    this.privacyStatus = page.locator('[data-testid=privacy-status]')
    this.privacyIndicator = page.locator('[data-testid=privacy-indicator]')
    this.confirmPrivacyDialog = page.locator('[data-testid=confirm-privacy-dialog]')
    this.privacySuccessToast = page.locator('[data-testid=privacy-success-toast]')
    this.accessDeniedMessage = page.locator('[data-testid=access-denied]')
  }

  /**
   * Navigate to a wiki by slug
   */
  async goto(slug: string): Promise<void> {
    await this.page.goto(`/wiki/${slug}`, { waitUntil: 'load' })
    await this.waitForLoad()
  }

  /**
   * Wait for the wiki page to be fully loaded
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('body', { timeout: 10000 })
    await expect(this.fileList).toBeVisible({ timeout: 15000 })
    await expect(this.markdownContent.first()).toBeVisible({ timeout: 15000 })
  }

  /**
   * Click on a file in the sidebar
   */
  async clickFile(filename: string): Promise<void> {
    const fileButton = this.page.locator(`button:has-text("${filename}")`)
    await fileButton.click()
    await this.page.waitForTimeout(300) // Wait for content to load
  }

  /**
   * Enter edit mode
   */
  async enterEditMode(): Promise<void> {
    await expect(this.editButton).toBeVisible({ timeout: 10000 })
    await this.editButton.click()
    await expect(this.contentTextarea).toBeVisible({ timeout: 5000 })
  }

  /**
   * Exit edit mode (save or cancel)
   */
  async exitEditMode(method: 'save' | 'cancel' = 'save'): Promise<void> {
    if (method === 'save') {
      await this.saveEditButton.click()
      await expect(this.editButton).toBeVisible({ timeout: 15000 })
    } else {
      // Handle potential confirmation dialog
      this.page.once('dialog', async (dialog) => {
        await dialog.accept()
      })
      await this.cancelEditButton.click()
      await expect(this.editButton).toBeVisible({ timeout: 10000 })
    }
  }

  /**
   * Edit content
   */
  async editContent(content: string): Promise<void> {
    await this.contentTextarea.clear()
    await this.contentTextarea.fill(content)
  }

  /**
   * Get current content
   */
  async getContent(): Promise<string> {
    return await this.contentTextarea.inputValue()
  }

  /**
   * Toggle preview mode
   */
  async togglePreview(): Promise<void> {
    await this.previewToggle.click()
    await this.page.waitForTimeout(300)
  }

  /**
   * Enter manage mode
   */
  async enterManageMode(): Promise<void> {
    if (await this.manageButton.isVisible()) {
      await this.manageButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Exit manage mode
   */
  async exitManageMode(): Promise<void> {
    if (await this.exitManageButton.isVisible()) {
      await this.exitManageButton.click()
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * Click history button for a file
   */
  async clickHistoryButton(fileId?: string): Promise<void> {
    const historyButton = fileId
      ? this.page.locator(`[data-testid="history-${fileId}"]`)
      : this.page.locator('[data-testid^="history-"]').first()

    await expect(historyButton).toBeVisible({ timeout: 10000 })
    await historyButton.click()
  }

  /**
   * Get file count
   */
  async getFileCount(): Promise<number> {
    const files = this.page.locator('[data-testid=file-list] button')
    return await files.count()
  }

  /**
   * Check if in edit mode
   */
  async isInEditMode(): Promise<boolean> {
    return await this.contentTextarea.isVisible().catch(() => false)
  }

  /**
   * Check if in manage mode
   */
  async isInManageMode(): Promise<boolean> {
    return await this.exitManageButton.isVisible().catch(() => false)
  }

  /**
   * Get current privacy status
   */
  async getPrivacyStatus(): Promise<string> {
    return await this.privacyStatus.textContent() || ''
  }

  /**
   * Check if wiki is public
   */
  async isPublic(): Promise<boolean> {
    const status = await this.getPrivacyStatus()
    return status.toLowerCase() === 'public'
  }

  /**
   * Check if wiki is private
   */
  async isPrivate(): Promise<boolean> {
    const status = await this.getPrivacyStatus()
    return status.toLowerCase() === 'private'
  }

  /**
   * Toggle privacy setting
   */
  async togglePrivacy(confirm: boolean = true): Promise<void> {
    await this.privacyToggle.click()

    if (confirm) {
      // Wait for confirmation dialog
      await this.page.waitForSelector('[data-testid="confirm-privacy-dialog"]', { timeout: 5000 })

      // Determine which button to click based on desired state
      const currentStatus = await this.getPrivacyStatus()
      if (currentStatus.toLowerCase() === 'private') {
        // Making it public
        const confirmButton = this.page.locator('[data-testid="confirm-public-button"]')
        await confirmButton.click()
      } else {
        // Making it private
        const confirmButton = this.page.locator('[data-testid="confirm-private-button"]')
        await confirmButton.click()
      }
    }
  }

  /**
   * Wait for privacy success toast
   */
  async waitForPrivacySuccess(): Promise<void> {
    await this.privacySuccessToast.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Check if access denied message is shown
   */
  async isAccessDenied(): Promise<boolean> {
    return await this.accessDeniedMessage.isVisible().catch(() => false)
  }

  /**
   * Check if privacy controls are visible
   */
  async arePrivacyControlsVisible(): Promise<boolean> {
    return await this.privacyToggle.isVisible().catch(() => false)
  }
}

