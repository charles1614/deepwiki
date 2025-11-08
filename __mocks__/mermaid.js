// Mock mermaid library
module.exports = {
  mermaid: {
    render: jest.fn().mockResolvedValue({ svg: '<svg class="mermaid"></svg>' }),
    init: jest.fn(),
    parse: jest.fn().mockReturnValue({}),
    run: jest.fn(),
    start: jest.fn()
  }
}