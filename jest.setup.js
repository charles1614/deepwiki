import '@testing-library/jest-dom'

// Polyfill setImmediate for Jest/Node environment
global.setImmediate = (fn) => setTimeout(fn, 0)

// Mock ReadableStream first
global.ReadableStream = class ReadableStream {
  constructor() {}
}

Object.defineProperty(ReadableStream.prototype, 'pipeTo', {
  value: jest.fn(),
  writable: true,
})


// Mock Request and Response classes for Next.js API routes
global.Request = class Request {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.body = options.body
    this.json = async () => {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
  }
}

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.headers = new Map(Object.entries(options.headers || {}))
  }

  async json() {
    if (typeof this.body === 'string') {
      return JSON.parse(this.body)
    }
    return this.body
  }

  static json(body, options = {}) {
    return new Response(JSON.stringify(body), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  }
}

// Mock NextResponse
global.NextResponse = {
  json: (body, options = {}) => Response.json(body, options),
}

// Mock Blob
global.Blob = class Blob {
  constructor(content, options = {}) {
    this.content = content
    this.type = options.type || ''
    // Calculate size based on content
    if (Array.isArray(content)) {
      this.size = content.reduce((total, part) => {
        if (typeof part === 'string') {
          return total + new TextEncoder().encode(part).length
        }
        return total + (part.size || 0)
      }, 0)
    } else if (typeof content === 'string') {
      this.size = new TextEncoder().encode(content).length
    } else {
      this.size = 0
    }
  }
}

// Mock File
global.File = class File {
  constructor(content, name, options = {}) {
    this.content = content
    this.name = name
    this.type = options.type || ''
    // Calculate size based on content type
    if (Array.isArray(content)) {
      // Handle array of content parts (like real File constructor)
      this.size = content.reduce((total, part) => {
        if (typeof part === 'string') {
          return total + part.length
        }
        return total + (part.size || 0)
      }, 0)
    } else if (typeof content === 'string') {
      this.size = content.length
    } else if (content instanceof Blob) {
      this.size = content.size
    } else {
      this.size = 0
    }
  }

  text() {
    if (typeof this.content === 'string') {
      return Promise.resolve(this.content)
    } else if (Array.isArray(this.content)) {
      return Promise.resolve(this.content.join(''))
    }
    return Promise.resolve('')
  }
}

// Mock FormData
global.FormData = class FormData {
  constructor() {
    this.data = new Map()
  }

  append(key, value, filename) {
    if (!this.data.has(key)) {
      this.data.set(key, [])
    }
    this.data.get(key).push({ value, filename })
  }

  get(key) {
    const values = this.data.get(key)
    return values && values.length > 0 ? values[0] : null
  }

  getAll(key) {
    const values = this.data.get(key) || []
    return values.map(item => item.value)
  }

  entries() {
    const result = []
    for (const [key, values] of this.data) {
      for (const item of values) {
        result.push([key, item.value])
      }
    }
    return result
  }
}