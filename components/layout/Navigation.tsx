'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  BookOpenIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ArrowRightOnRectangleIcon,
  UsersIcon,
  Cog6ToothIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'
// import { getPublicSystemSettings } from '@/app/actions/public-settings'

// ... existing imports ...

type TabType = 'home' | 'wiki' | 'upload' | 'search'

interface Wiki {
  id: string
  title: string
  slug: string
}

interface NavigationProps {
  className?: string
}

export function Navigation({ className = '' }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const [siteName, setSiteName] = useState('DeepWiki')
  const [activeTab, setActiveTab] = useState('home')
  const [showBackButton, setShowBackButton] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [recentWikis, setRecentWikis] = useState<any[]>([])
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const isAdmin = session?.user?.role === 'ADMIN'

  const handleLogout = () => {
    signOut({ callbackUrl: `${window.location.origin}/login` })
  }
  // ... existing state ...

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings/public')
        if (response.ok) {
          const settings = await response.json()
          if (settings['site_name']) {
            setSiteName(settings['site_name'])
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Determine active tab based on current pathname
  useEffect(() => {
    if (pathname === '/') {
      setActiveTab('home')
    } else if (pathname.startsWith('/wiki')) {
      if (pathname === '/wiki') {
        setActiveTab('wiki')
        setShowBackButton(false)
      } else {
        setActiveTab('wiki')
        setShowBackButton(true)
      }
    } else if (pathname.startsWith('/upload')) {
      setActiveTab('upload')
    } else if (pathname.startsWith('/search')) {
      setActiveTab('search')
    }
  }, [pathname])

  // Fetch recent wikis
  useEffect(() => {
    if (session) {
      fetchRecentWikis()
    }
  }, [session])

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        performSearch(searchQuery)
      }, 300)

      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const fetchRecentWikis = async () => {
    try {
      const response = await fetch('/api/wiki/list')
      if (response.ok) {
        const data = await response.json()
        setRecentWikis(data.wikis?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Failed to fetch recent wikis:', error)
    }
  }

  const performSearch = async (query: string) => {
    try {
      const response = await fetch(`/api/wiki/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        // API returns { success: true, results: [{ wiki: {...}, matches: [...] }] }
        // Extract wikis from results
        if (data.success && data.results) {
          const wikis = data.results.map((result: any) => result.wiki)
          setSearchResults(wikis)
        } else {
          setSearchResults([])
        }
      }
    } catch (error) {
      console.error('Search failed:', error)
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setIsMobileMenuOpen(false)

    // Navigate to appropriate route
    switch (tab) {
      case 'home':
        router.push('/dashboard')
        break
      case 'wiki':
        // Set flag to help fix browser cache redirect issue
        sessionStorage.setItem('intendedWikiPage', 'true')
        router.push('/wiki')
        break
      case 'upload':
        router.push('/upload')
        break
      case 'search':
        router.push('/search')
        break
    }
  }

  const handleBackNavigation = () => {
    if (window.history.length > 2) {
      router.back()
    } else {
      router.push('/wiki')
    }
  }

  const handleWikiClick = (wiki: Wiki) => {
    router.push(`/wiki/${wiki.slug}`)
    setSearchQuery('')
    setSearchResults([])
    setIsMobileMenuOpen(false)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
      setIsMobileMenuOpen(false)
    }
  }

  // Responsive design
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isUserMenuOpen])


  const tabs = [
    { id: 'home', label: 'Dashboard', icon: HomeIcon, href: '/dashboard' },
    { id: 'wiki', label: 'Wiki', icon: BookOpenIcon, href: '/wiki' },
    { id: 'upload', label: 'Upload', icon: CloudArrowUpIcon, href: '/upload' },
    { id: 'search', label: 'Search', icon: MagnifyingGlassIcon, href: '/search' }
  ]


  return (
    <nav
      className={`bg-white border-b border-gray-200 shadow-sm ${className}`}
      role="navigation"
      aria-label="Main navigation"
      data-testid="navigation-component"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile menu button */}
        <div className="flex items-center justify-between h-16 md:hidden">
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={handleBackNavigation}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-2"
                data-testid="nav-back-button"
                aria-label="Go back"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">{siteName}</h1>

          {/* User menu for mobile */}
          {session && (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
                data-testid="mobile-user-menu-button"
              >
                <span className="text-white text-sm font-medium">
                  {session.user?.email?.charAt(0).toUpperCase()}
                </span>
              </button>

              {/* Dropdown menu for mobile */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{session.user?.email}</p>
                  </div>

                  <div className="py-1">
                    {/* Admin Links */}
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Admin</p>

                      <button
                        onClick={() => {
                          if (isAdmin) {
                            router.push('/admin/users')
                            setIsUserMenuOpen(false)
                            setIsMobileMenuOpen(false)
                          }
                        }}
                        disabled={!isAdmin}
                        className={`group flex w-full items-center px-2 py-2 text-sm rounded-md ${isAdmin
                          ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                        title={!isAdmin ? "Only administrators can manage users" : ""}
                      >
                        <UsersIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                        Manage Users
                      </button>

                      <button
                        onClick={() => {
                          if (isAdmin) {
                            router.push('/admin/settings')
                            setIsUserMenuOpen(false)
                            setIsMobileMenuOpen(false)
                          }
                        }}
                        disabled={!isAdmin}
                        className={`group flex w-full items-center px-2 py-2 text-sm rounded-md ${isAdmin
                          ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                        title={!isAdmin ? "Only administrators can access system settings" : ""}
                      >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                        System Settings
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="group flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>


        {/* Desktop navigation */}
        <div className="hidden md:flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">{siteName}</h1>
            </div>

            {/* Main navigation tabs */}
            <div className="flex space-x-1" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as TabType)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    aria-controls={`${tab.id}-panel`}
                    data-testid={`tab-${tab.id}`}
                    data-active={activeTab === tab.id}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Search input for desktop */}
            <div className="ml-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search wikis..."
                  className="w-64 pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  data-testid="desktop-search-input"
                  aria-label="Search wikis"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </form>
            </div>
          </div>

          {/* User menu dropdown */}
          {session && (
            <div className="relative ml-4" ref={userMenuRef} data-testid="user-menu">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label="User menu"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-2 shadow-sm">
                  <span className="text-white text-xs font-medium">
                    {session.user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:block text-sm font-medium">
                  {session.user?.email?.split('@')[0]}
                </span>
              </button>

              {/* Dropdown menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 z-50 origin-top-right transform transition-all duration-200 ease-out">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Signed in as</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{session.user?.email}</p>
                  </div>

                  <div className="py-1">
                    {/* Admin Links */}
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Admin</p>

                      <button
                        onClick={() => {
                          if (isAdmin) {
                            router.push('/admin/users')
                            setIsUserMenuOpen(false)
                          }
                        }}
                        disabled={!isAdmin}
                        className={`group flex w-full items-center px-2 py-2 text-sm rounded-md ${isAdmin
                          ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                        title={!isAdmin ? "Only administrators can manage users" : ""}
                      >
                        <UsersIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                        Manage Users
                      </button>

                      <button
                        onClick={() => {
                          if (isAdmin) {
                            router.push('/admin/settings')
                            setIsUserMenuOpen(false)
                          }
                        }}
                        disabled={!isAdmin}
                        className={`group flex w-full items-center px-2 py-2 text-sm rounded-md ${isAdmin
                          ? 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                          : 'text-gray-400 cursor-not-allowed opacity-60'
                          }`}
                        title={!isAdmin ? "Only administrators can access system settings" : ""}
                      >
                        <Cog6ToothIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                        System Settings
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={handleLogout}
                      className="group flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Back button for desktop */}
          {showBackButton && (
            <button
              onClick={handleBackNavigation}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md mr-4"
              data-testid="nav-back-button"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Back
            </button>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200" data-testid="main-nav">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as TabType)}
                  className={`flex items-center w-full px-3 py-2 text-base font-medium rounded-md ${activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Search in mobile menu */}
          <div className="border-t border-gray-200 px-2 pt-2 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search wikis..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="search-input"
                aria-label="Search wikis"
              />
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </form>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1" data-testid="search-results">
                <p className="px-3 text-xs font-medium text-gray-500">Search Results</p>
                {searchResults.map((wiki) => (
                  <button
                    key={wiki.id}
                    onClick={() => handleWikiClick(wiki)}
                    className="block w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                    data-testid={`search-result-${wiki.slug}`}
                  >
                    <div className="font-medium text-gray-900">{wiki.title}</div>
                    <div className="text-xs text-gray-500">{wiki.slug}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Status announcements for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        Navigated to {tabs.find(tab => tab.id === activeTab)?.label}
      </div>
    </nav>
  )
}