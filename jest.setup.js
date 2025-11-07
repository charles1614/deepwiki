import '@testing-library/jest-dom'

// Polyfill setImmediate for Jest/Node environment
global.setImmediate = (fn) => setTimeout(fn, 0)

// Mock marked library globally to prevent ES module issues
jest.mock('marked', () => {
  const markedFn = jest.fn((markdown, options) => {
    // Default markdown parsing
    let html = markdown

    // Handle code blocks FIRST (before inline code)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      if (lang === 'mermaid') {
        return `<div class="mermaid my-6">${code.trim()}</div>`
      }
      return `<pre class="prose-pre"><code class="prose-code">${code.trim()}</code></pre>`
    })

    // Handle other markdown elements with proper typography classes
    html = html
      .replace(/^#### (.+)$/gm, '<h4 class="heading-4 prose-headings">$1</h4>')
      .replace(/^##### (.+)$/gm, '<h5 class="heading-5 prose-headings">$1</h5>')
      .replace(/^###### (.+)$/gm, '<h6 class="heading-6 prose-headings">$1</h6>')
      .replace(/^### (.+)$/gm, '<h3 class="heading-3 prose-headings">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="heading-2 prose-headings">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="heading-1 prose-headings">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="prose-code">$1</code>')
      .replace(/^> (.+)$/gm, '<blockquote class="prose-blockquote">$1</blockquote>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="prose-a" data-hover-styles>$1</a>')

    // Handle complex patterns after basic replacements

    // Handle tables - simple implementation for tests
    html = html.replace(/^\|(.+)\|$\n^\|(.+)\|$\n((?:\|.+\|$)*)/gm, (match, header, separator, rows) => {
      const headerCells = header.split('|').map(cell => cell.trim()).filter(cell => cell)
      const bodyRows = rows.split('\n').filter(row => row.trim()).map(row => {
        const cells = row.replace(/^\|(.+)\|$/, '$1').split('|').map(cell => cell.trim()).filter(cell => cell)
        return '<tr>' + cells.map(cell => `<td class="prose-td">${cell}</td>`).join('') + '</tr>'
      }).join('')
      const headerRow = '<thead><tr>' + headerCells.map(cell => `<th class="prose-th">${cell}</th>`).join('') + '</tr></thead>'
      const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : ''
      return `<table class="prose-table">${headerRow}${tbody}</table>`
    })

    // Handle ordered lists
    html = html.replace(/^(\d+\..+(?:\n\d+\..+)*)$/gm, (match) => {
      const items = match.split('\n').map(item =>
        item.replace(/^\d+\.\s/, '<li class="prose-li">') + '</li>'
      ).join('')
      return `<ol class="prose-ol">${items}</ol>`
    })

    // Handle unordered lists
    html = html.replace(/^(-[^*\n].+(?:\n-[^*\n].+)*)$/gm, (match) => {
      const items = match.split('\n').map(item =>
        item.replace(/^-\s/, '<li class="prose-li">') + '</li>'
      ).join('')
      return `<ul class="prose-ul">${items}</ul>`
    })

    // Handle paragraphs - wrap remaining text in paragraphs
    html = html.replace(/\n\n/g, '</p><p class="prose-p">')
    html = '<p class="prose-p">' + html + '</p>'

    return html
  })

  markedFn.use = jest.fn()
  markedFn.Marked = jest.fn().mockImplementation(() => ({
    parse: jest.fn((markdown) => markedFn(markdown)),
    use: jest.fn()
  }))

  return {
    marked: markedFn,
    Marked: jest.fn().mockImplementation(() => ({
      parse: jest.fn((markdown) => markedFn(markdown)),
      use: jest.fn()
    }))
  }
})

// Mock mermaid library
jest.mock('mermaid', () => ({
  default: {
    initialize: jest.fn(),
    run: jest.fn().mockResolvedValue(undefined),
    init: jest.fn()
  }
}))

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((html) => html)
}))

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