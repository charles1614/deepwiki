import { NextRequest } from 'next/server'

/**
 * Factory for creating NextRequest test data for API route tests
 */

/**
 * Create a mock NextRequest for GET requests
 * 
 * @example
 * ```ts
 * const request = createGetRequest('/api/wiki')
 * ```
 */
export function createGetRequest(url: string, options: {
  headers?: Record<string, string>
} = {}): NextRequest {
  return createRequest(url, {
    method: 'GET',
    ...options,
  })
}

/**
 * Create a mock NextRequest for POST requests
 * 
 * @example
 * ```ts
 * const request = createPostRequest('/api/wiki', { title: 'My Wiki' })
 * ```
 */
export function createPostRequest(
  url: string,
  body: any,
  options: {
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return createRequest(url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Create a mock NextRequest for PUT requests
 */
export function createPutRequest(
  url: string,
  body: any,
  options: {
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return createRequest(url, {
    method: 'PUT',
    body,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

/**
 * Create a mock NextRequest for DELETE requests
 */
export function createDeleteRequest(
  url: string,
  options: {
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return createRequest(url, {
    method: 'DELETE',
    ...options,
  })
}

/**
 * Create a mock NextRequest for file upload (multipart/form-data)
 */
export function createUploadRequest(
  url: string,
  formData: FormData,
  options: {
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return createRequest(url, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...options.headers,
    },
  })
}

/**
 * Create a mock NextRequest with full control
 */
export function createRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body } = options

  const requestHeaders = new Headers()
  Object.entries(headers).forEach(([key, value]) => {
    requestHeaders.set(key, value)
  })

  const requestInit: RequestInit = {
    method,
    headers: requestHeaders,
  }

  if (body) {
    if (body instanceof FormData) {
      requestInit.body = body
    } else if (typeof body === 'string') {
      requestInit.body = body
    } else {
      requestInit.body = JSON.stringify(body)
      if (!requestHeaders.has('Content-Type')) {
        requestHeaders.set('Content-Type', 'application/json')
      }
    }
  }

  return new NextRequest(url, requestInit as any)
}

/**
 * Create a mock NextRequest with authentication headers
 */
export function createAuthenticatedRequest(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: any
    sessionToken?: string
  } = {}
): NextRequest {
  const { sessionToken = 'test-session-token', ...restOptions } = options

  return createRequest(url, {
    ...restOptions,
    headers: {
      Cookie: `next-auth.session-token=${sessionToken}`,
      ...restOptions.headers,
    },
  })
}

/**
 * Create a mock NextRequest with JSON body
 */
export function createJsonRequest(
  url: string,
  body: any,
  options: {
    method?: string
    headers?: Record<string, string>
  } = {}
): NextRequest {
  return createRequest(url, {
    method: options.method || 'POST',
    body,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}

