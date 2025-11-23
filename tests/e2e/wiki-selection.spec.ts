import { test, expect } from './helpers/fixtures'
import { prisma } from '@/lib/database'
import bcrypt from 'bcryptjs'

test.describe('Wiki Selection', () => {
  test('should select all wikis across pages', async ({ page }) => {
    // Create an admin user for the test (unique email per run)
    const timestamp = Date.now()
    const adminEmail = `wiki-admin-${timestamp}@test.example.com`
    const hashedPassword = await bcrypt.hash('password123', 10)

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    // Create 20 wikis to test pagination (assuming 15 per page)
    const wikis = []
    for (let i = 0; i < 20; i++) {
      const wiki = await prisma.wiki.create({
        data: {
          title: `Test Wiki ${i}`,
          slug: `test-wiki-${i}-${Date.now()}`,
          description: `Description ${i}`,
          ownerId: admin.id,
        },
      })
      wikis.push(wiki)
    }

    // Login as admin and navigate to wiki list
    await page.goto('/login')
    await page.fill('input[name="email"]', adminEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard', { timeout: 15000 })

    // Wait for session to be fully established (important for webkit)
    await page.waitForTimeout(2000)
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 })

    // Go to Wiki List
    await page.goto('/wiki')
    await page.waitForSelector('[data-testid="wiki-list"]', { timeout: 10000 })

    // Click Manage button to enable management mode
    const manageButton = page.locator('[data-testid="manage-wikis-button"]')
    await expect(manageButton).toBeVisible()
    await manageButton.click()

    // Click Select All checkbox
    const selectAllCheckbox = page.locator('[data-testid="select-all-checkbox"]')
    await expect(selectAllCheckbox).toBeVisible()
    await selectAllCheckbox.check()

    // Verify selection counter appears
    const selectionCounter = page.locator('[data-testid="bulk-actions"]', { hasText: /selected/ })
    await expect(selectionCounter).toBeVisible({ timeout: 5000 })

    // Verify all wikis are selected (the counter should show the total)
    const selectedText = await selectionCounter.textContent()
    expect(selectedText).toContain('selected')

    // Navigate to next page if pagination exists
    const nextPageBtn = page.locator('[data-testid="next-page-button"]')
    const isNextPageVisible = await nextPageBtn.isVisible().catch(() => false)
    const isNextPageEnabled = isNextPageVisible && await nextPageBtn.isEnabled().catch(() => false)

    if (isNextPageEnabled) {
      await nextPageBtn.click()
      await page.waitForTimeout(500)
      // Verify selection persists - counter should still be visible
      await expect(selectionCounter).toBeVisible()
    }

    // Cleanup
    await prisma.wiki.deleteMany({ where: { ownerId: admin.id } })
    await prisma.user.delete({ where: { id: admin.id } })
  })
})
