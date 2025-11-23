// Manual mock for mermaid library
// This is automatically used when you call jest.mock('mermaid') without implementation
module.exports = {
  default: {
    initialize: jest.fn(),
    run: jest.fn().mockResolvedValue(undefined),
    init: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg>Mock SVG</svg>' }),
    parse: jest.fn().mockReturnValue({}),
    start: jest.fn(),
  },
  // Also support named export
  mermaid: {
    initialize: jest.fn(),
    run: jest.fn().mockResolvedValue(undefined),
    init: jest.fn(),
    render: jest.fn().mockResolvedValue({ svg: '<svg>Mock SVG</svg>' }),
    parse: jest.fn().mockReturnValue({}),
    start: jest.fn(),
  },
}