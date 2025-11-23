import '@testing-library/jest-dom'
import 'whatwg-fetch'
import { TextEncoder, TextDecoder } from 'util'

// Import custom matchers
import './tests/unit/utils/matchers'

// Polyfill TextEncoder/TextDecoder for jsdom
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill setImmediate for Jest/Node environment
global.setImmediate = (fn) => setTimeout(fn, 0)

// Use manual mocks from __mocks__ directory
// Jest automatically finds and uses __mocks__/marked.js, __mocks__/mermaid.js, etc.
jest.mock('marked')
jest.mock('mermaid')
jest.mock('dompurify')

// Mock next-auth (server-side auth)
jest.mock('next-auth', () => {
  return jest.fn(() => ({
    handlers: { GET: jest.fn(), POST: jest.fn() },
    auth: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }))
})

// Mock next-auth/react (can be overridden in individual tests)
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'unauthenticated'
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

// Mock next/navigation (can be overridden in individual tests)
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  refresh: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '',
  useParams: () => ({}),
}))

// Mock ReadableStream if not available (jsdom might have it now, but safety check)
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = class ReadableStream {
    constructor() { }
  }
}

// Mock NextResponse
// We still need to mock NextResponse as it's a Next.js specific extension of Response
// But we can base it on the native Response now available via whatwg-fetch or jsdom
import { NextResponse } from 'next/server'

// Since we can't import NextResponse in jest.setup.js easily without transforming, 
// and we want to avoid complex transforms for setup, we can mock the static methods we use.
// However, if we are in a test environment, we might want to just mock it simply.
global.NextResponse = {
  json: (body, options = {}) => {
    return new Response(JSON.stringify(body), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  },
  redirect: (url, options = {}) => {
    return new Response(null, {
      status: 307,
      headers: {
        Location: url,
        ...options?.headers,
      },
    })
  },
  next: () => new Response(null),
}