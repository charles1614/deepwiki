import { User, Role } from '@prisma/client'

/**
 * Factory for creating User test data
 * Provides realistic defaults and allows easy overrides
 */

let userCounter = 0

/**
 * Generate a unique email for testing
 */
function generateUniqueEmail(prefix: string = 'test'): string {
  userCounter++
  return `${prefix}-user-${userCounter}-${Date.now()}@example.com`
}

/**
 * Create a User factory function
 * 
 * @example
 * ```ts
 * const user = createUser({ email: 'admin@example.com', role: 'ADMIN' })
 * ```
 */
export function createUser(overrides: Partial<User> = {}): User {
  const now = new Date()
  const email = overrides.email || generateUniqueEmail()

  return {
    id: overrides.id || `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    email,
    password: overrides.password || 'hashedpassword123',
    role: overrides.role || Role.USER,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    ...overrides,
  }
}

/**
 * Create multiple users with unique emails
 */
export function createUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, (_, index) =>
    createUser({
      ...overrides,
      email: overrides.email || generateUniqueEmail(`user${index}`),
    })
  )
}

/**
 * Create an admin user
 */
export function createAdminUser(overrides: Partial<User> = {}): User {
  return createUser({
    role: Role.ADMIN,
    ...overrides,
  })
}

/**
 * Reset the user counter (useful for test isolation)
 */
export function resetUserCounter(): void {
  userCounter = 0
}

