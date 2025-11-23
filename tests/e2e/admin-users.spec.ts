import { test, expect } from './helpers/fixtures'
import { prisma } from '@/lib/database'
import bcrypt from 'bcryptjs'

test.describe('Admin User Management', () => {
  test('should support bulk deletion of users', async ({ page }) => {
    // Create test admin user with proper permissions (unique email per run)
    const timestamp = Date.now()
    const adminEmail = `admin-test-${timestamp}@test.example.com`
    const hashedPassword = await bcrypt.hash('password123', 10)

    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
      },
    })

    // Create test users to delete
    const testUsers = await Promise.all([
      prisma.user.create({
        data: {
          email: `test-user1-${timestamp}@test.example.com`,
          password: hashedPassword,
          role: 'USER',
        },
      }),
      prisma.user.create({
        data: {
          email: `test-user2-${timestamp}@test.example.com`,
          password: hashedPassword,
          role: 'USER',
        },
      }),
      prisma.user.create({
        data: {
          email: `test-user3-${timestamp}@test.example.com`,
          password: hashedPassword,
          role: 'USER',
        },
      }),
    ])

    // Login as admin
    await page.goto('/login')
    await page.fill('input[name="email"]', adminEmail)
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard', { timeout: 30000 })

    // Wait for session to be fully established (important for webkit)
    await page.waitForTimeout(2000)
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 })

    // Navigate to Admin Users page
    await page.goto('/admin/users')
    await page.waitForSelector('table', { timeout: 10000 })

    // Find and select users to delete
    const user1Row = page.locator('tr', { hasText: testUsers[0].email })
    const user2Row = page.locator('tr', { hasText: testUsers[1].email })

    await user1Row.locator('input[type="checkbox"]').check()
    await user2Row.locator('input[type="checkbox"]').check()

    // Set up dialog handler before clicking the button
    let dialogConfirmed = false
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      expect(dialog.message()).toContain('delete')
      dialogConfirmed = true
      await dialog.accept()
    })

    // Click Delete Selected button
    const deleteButton = page.locator('button', { hasText: /Delete Selected/ })
    await expect(deleteButton).toBeVisible()
    await deleteButton.click()
    // Wait for bulk delete API response
    await page.waitForResponse(response => response.url().includes('/api/admin/users/bulk-delete') && response.status() === 200)
    // Ensure rows are removed
    await expect(user1Row).not.toBeVisible({ timeout: 10000 })
    await expect(user2Row).not.toBeVisible({ timeout: 10000 })
    // Wait for the dialog to be confirmed and the deletion to complete
    await page.waitForTimeout(1000)
    expect(dialogConfirmed).toBe(true)

    // Wait for the page to refresh or users to be removed from DOM
    await page.waitForTimeout(2000)

    // Verify users are removed
    await expect(user1Row).not.toBeVisible({ timeout: 5000 })
    await expect(user2Row).not.toBeVisible({ timeout: 5000 })

    // Verify user3 is still visible
    const user3Row = page.locator('tr', { hasText: testUsers[2].email })
    await expect(user3Row).toBeVisible()

    // Cleanup
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [adminEmail, ...testUsers.map(u => u.email)]
        }
      }
    })
  })
})
