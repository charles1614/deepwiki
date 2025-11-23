/**
 * Centralized mock setup functions
 * Use these helpers to set up mocks consistently across tests
 */

import { Session } from 'next-auth'
import { NextRequest } from 'next/server'

/**
 * Create a mock NextAuth session
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ...overrides,
  }
}

/**
 * Create a mock NextRequest
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options

  const request = {
    url,
    method,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null,
      has: (name: string) => name.toLowerCase() in headers,
      ...headers,
    },
    json: async () => {
      if (typeof body === 'string') {
        return JSON.parse(body)
      }
      return body
    },
    text: async () => {
      if (typeof body === 'string') {
        return body
      }
      return JSON.stringify(body)
    },
    formData: async () => {
      if (body instanceof FormData) {
        return body
      }
      return new FormData()
    },
  } as unknown as NextRequest

  return request
}

/**
 * Create a mock Response
 */
export function createMockResponse(
  data: any,
  options: {
    status?: number
    headers?: Record<string, string>
  } = {}
): Response {
  const { status = 200, headers = {} } = options

  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers(headers),
    json: async () => data,
    text: async () => (typeof data === 'string' ? data : JSON.stringify(data)),
  } as Response
}

/**
 * Setup fetch mock with default handlers
 */
export function setupFetchMock(
  defaultHandler?: (url: string, options?: RequestInit) => Promise<Response>
) {
  const mockFetch = jest.fn()

  if (defaultHandler) {
    mockFetch.mockImplementation(defaultHandler)
  } else {
    // Default handler that returns 404 for unmatched routes
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
      text: async () => 'Not found',
    } as Response)
  }

  global.fetch = mockFetch as typeof fetch

  return mockFetch
}

/**
 * Setup Next.js router mocks
 */
export function setupRouterMocks(overrides: {
  push?: jest.Mock
  replace?: jest.Mock
  back?: jest.Mock
  refresh?: jest.Mock
  prefetch?: jest.Mock
  pathname?: string
  searchParams?: URLSearchParams
  params?: Record<string, string>
} = {}) {
  const {
    push = jest.fn(),
    replace = jest.fn(),
    back = jest.fn(),
    refresh = jest.fn(),
    prefetch = jest.fn(),
    pathname = '/',
    searchParams = new URLSearchParams(),
    params = {},
  } = overrides

  jest.mock('next/navigation', () => ({
    useRouter: () => ({
      push,
      replace,
      back,
      refresh,
      prefetch,
    }),
    usePathname: () => pathname,
    useSearchParams: () => searchParams,
    useParams: () => params,
  }))

  return {
    push,
    replace,
    back,
    refresh,
    prefetch,
    pathname,
    searchParams,
    params,
  }
}

/**
 * Setup NextAuth mocks
 */
export function setupNextAuthMocks(overrides: {
  session?: Session | null
  status?: 'authenticated' | 'unauthenticated' | 'loading'
  signIn?: jest.Mock
  signOut?: jest.Mock
} = {}) {
  const {
    session = null,
    status = session ? 'authenticated' : 'unauthenticated',
    signIn = jest.fn(),
    signOut = jest.fn(),
  } = overrides

  jest.mock('next-auth/react', () => ({
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
    useSession: jest.fn(() => ({
      data: session,
      status,
    })),
    signIn,
    signOut,
  }))

  return {
    session,
    status,
    signIn,
    signOut,
  }
}

/**
 * Reset all mocks to their initial state
 */
export function resetAllMocks() {
  jest.clearAllMocks()
  jest.restoreAllMocks()
}

/**
 * Create a mock function that tracks calls with timestamps
 */
export function createTrackedMock<T extends (...args: any[]) => any>(
  implementation?: T
): jest.MockedFunction<T> & {
  getCalls: () => Array<{ args: Parameters<T>; timestamp: number }>
  getLastCall: () => { args: Parameters<T>; timestamp: number } | null
} {
  const calls: Array<{ args: Parameters<T>; timestamp: number }> = []
  const mockFn = jest.fn(implementation) as any

  const trackedMock = ((...args: Parameters<T>) => {
    calls.push({
      args,
      timestamp: Date.now(),
    })
    return mockFn(...args)
  }) as typeof mockFn

  trackedMock.getCalls = () => [...calls]
  trackedMock.getLastCall = () => (calls.length > 0 ? calls[calls.length - 1] : null)

  // Copy all jest mock properties
  Object.setPrototypeOf(trackedMock, mockFn)
  Object.assign(trackedMock, mockFn)

  return trackedMock
}

/**
 * Wait for a mock to be called
 */
export async function waitForMockCall(
  mockFn: jest.Mock,
  options: { timeout?: number; interval?: number } = {}
): Promise<jest.MockContext<any, any[]>> {
  const { timeout = 5000, interval = 100 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (mockFn.mock.calls.length > 0) {
      return mockFn.mock
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }

  throw new Error('Mock was not called within timeout')
}

