// Manual mock for dompurify library
// This is automatically used when you call jest.mock('dompurify') without implementation
module.exports = {
  sanitize: jest.fn((html) => html),
  default: {
    sanitize: jest.fn((html) => html),
  },
}

