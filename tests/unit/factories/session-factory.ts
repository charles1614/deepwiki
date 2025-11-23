import { Session } from 'next-auth'
import { createUser } from './user-factory'

/**
 * Factory for creating NextAuth session test data
 */

/**
 * Create a mock NextAuth session
 * 
 * @example
 * ```ts
 * const session = createSession({ user: { email: 'admin@example.com', role: 'ADMIN' } })
 * ```
 */
export function createSession(overrides: Partial<Session> = {}): Session {
  const user = createUser()
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      ...overrides.user,
    } as any,
    expires: overrides.expires || expires.toISOString(),
    ...overrides,
  }
}

/**
 * Create an authenticated session
 */
export function createAuthenticatedSession(overrides: Partial<Session> = {}): Session {
  return createSession({
    ...overrides,
    user: {
      id: 'authenticated-user-id',
      email: 'authenticated@example.com',
      role: 'USER',
      ...overrides.user,
    } as any,
  })
}

/**
 * Create an admin session
 */
export function createAdminSession(overrides: Partial<Session> = {}): Session {
  const adminUser = createUser({ role: 'ADMIN' })

  return createSession({
    ...overrides,
    user: {
      id: adminUser.id,
      email: adminUser.email,
      role: 'ADMIN',
      ...overrides.user,
    } as any,
  })
}

/**
 * Create an unauthenticated session (null)
 */
export function createUnauthenticatedSession(): null {
  return null
}

/**
 * Create an expired session
 */
export function createExpiredSession(overrides: Partial<Session> = {}): Session {
  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

  return createSession({
    ...overrides,
    expires: expiredDate.toISOString(),
  })
}

