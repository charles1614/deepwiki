// Mock window.location for all tests
if (!window.location.href) {
  Object.defineProperty(window, 'location', {
    value: {
      href: 'http://localhost:3000',
      replace: jest.fn(),
    },
    writable: true,
    configurable: true,
  })
}