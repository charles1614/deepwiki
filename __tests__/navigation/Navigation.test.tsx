import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { Navigation } from '@/components/layout/Navigation'

// Mock Next.js router
const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/wiki',
  query: {},
  asPath: '/wiki',
}

// Mock Next.js hooks that the component uses
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/wiki',
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: '1', email: 'test@example.com' } }
  }),
}))

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ wikis: [] }),
  })
)

// Mock window object
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
})

describe('Navigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Tab Navigation', () => {
    it('should render all navigation tabs', () => {
      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('navigation-component')).toBeInTheDocument()
      expect(screen.getByTestId('tab-home')).toBeInTheDocument()
      expect(screen.getByTestId('tab-wiki')).toBeInTheDocument()
      expect(screen.getByTestId('tab-upload')).toBeInTheDocument()
      expect(screen.getByTestId('tab-search')).toBeInTheDocument()
    })

    it('should highlight the active tab', () => {
      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      const wikiTab = screen.getByTestId('tab-wiki')
      expect(wikiTab).toHaveAttribute('data-active', 'true')

      const homeTab = screen.getByTestId('tab-home')
      expect(homeTab).toHaveAttribute('data-active', 'false')
    })

    it('should navigate when tab is clicked', async () => {
      const user = userEvent.setup()

      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      const homeTab = screen.getByTestId('tab-home')
      await user.click(homeTab)

      expect(mockPush).toHaveBeenCalledWith('/')
    })

    it('should have proper ARIA labels', () => {
      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'Main navigation')

      const homeTab = screen.getByTestId('tab-home')
      expect(homeTab).toHaveAttribute('role', 'tab')
    })
  })

  describe('Route Navigation', () => {
    it('should show back button when on wiki detail page', () => {
      const wikiDetailRouter = { ...mockRouter, pathname: '/wiki/test-wiki' }

      // Mock usePathname to return the wiki detail path
      jest.doMock('next/navigation', () => ({
        useRouter: () => mockRouter,
        usePathname: () => '/wiki/test-wiki',
      }))

      render(
        <AppRouterContext.Provider value={wikiDetailRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('nav-back-button')).toBeInTheDocument()
    })

    it('should show breadcrumb navigation', () => {
      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('breadcrumb-nav')).toBeInTheDocument()
      expect(screen.getByText('Wiki')).toBeInTheDocument()
    })
  })

  describe('Mobile Navigation', () => {
    it('should show hamburger menu on mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument()
    })

    it('should toggle mobile menu when hamburger is clicked', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      const user = userEvent.setup()

      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      const menuToggle = screen.getByTestId('mobile-menu-toggle')
      await user.click(menuToggle)

      expect(menuToggle).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('Search Functionality', () => {
    it('should show search input in mobile menu', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      const menuToggle = screen.getByTestId('mobile-menu-toggle')
      fireEvent.click(menuToggle)

      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search wikis...')).toBeInTheDocument()
    })
  })

  describe('Wiki Sidebar', () => {
    it('should show quick access links on desktop', () => {
      render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('wiki-sidebar')).toBeInTheDocument()
      expect(screen.getByTestId('quick-access')).toBeInTheDocument()
    })
  })

  describe('Responsive Navigation', () => {
    it('should adapt layout for different screen sizes', () => {
      // Desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      const { rerender } = render(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('navigation-component')).toBeInTheDocument()

      // Mobile
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      rerender(
        <AppRouterContext.Provider value={mockRouter}>
          <Navigation />
        </AppRouterContext.Provider>
      )

      expect(screen.getByTestId('mobile-menu-toggle')).toBeInTheDocument()
    })
  })
})