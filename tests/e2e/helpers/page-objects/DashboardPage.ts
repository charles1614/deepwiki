import { Page, Locator, expect } from '@playwright/test'

/**
 * Page Object Model for Dashboard page
 */
export class DashboardPage {
  readonly page: Page
  readonly stats: Locator
  readonly activityFeed: Locator
  readonly wikiList: Locator
  readonly createWikiButton: Locator

  constructor(page: Page) {
    this.page = page
    this.stats = page.locator('[data-testid=dashboard-stats]')
    this.activityFeed = page.locator('[data-testid=activity-feed]')
    this.wikiList = page.locator('[data-testid=wiki-list]')
    this.createWikiButton = page.locator('button:has-text("Create Wiki"), button:has-text("New Wiki")')
  }

  /**
   * Navigate to dashboard
   */
  async goto(): Promise<void> {
    await this.page.goto('/dashboard', { waitUntil: 'networkidle' })
    await this.waitForLoad()
  }

  /**
   * Wait for dashboard to load
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForSelector('body', { timeout: 10000 })
    // Dashboard might have different loading states
    await this.page.waitForTimeout(1000)
  }

  /**
   * Get wiki count from stats
   */
  async getWikiCount(): Promise<number> {
    const statsText = await this.stats.textContent()
    const match = statsText?.match(/(\d+)\s+wiki/i)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * Click on a wiki in the list
   */
  async clickWiki(title: string): Promise<void> {
    const wikiLink = this.page.locator(`a:has-text("${title}")`)
    await wikiLink.click()
    await this.page.waitForURL(/\/wiki\//, { timeout: 10000 })
  }

  /**
   * Check if wiki exists in list
   */
  async hasWiki(title: string): Promise<boolean> {
    const wikiLink = this.page.locator(`a:has-text("${title}")`)
    return await wikiLink.isVisible().catch(() => false)
  }
}

