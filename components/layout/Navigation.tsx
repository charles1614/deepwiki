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
  ChevronLeftIcon
} from '@heroicons/react/24/outline'
import { Input } from '@/components/ui/Input'

interface NavigationProps {
  className?: string
}

type TabType = 'home' | 'wiki' | 'upload' | 'search'

interface Wiki {
  id: string
  title: string
  slug: string
  updatedAt: string
}

export function Navigation({ className = '' }: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Wiki[]>([])
  const [recentWikis, setRecentWikis] = useState<Wiki[]>([])
  const [showBackButton, setShowBackButton] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
        setSearchResults(data.wikis || [])
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
          <h1 className="text-lg font-semibold text-gray-900">DeepWiki</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Desktop navigation */}
        <div className="hidden md:flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">DeepWiki</h1>
            </div>

            {/* Main navigation tabs */}
            <div className="flex space-x-1" role="tablist">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as TabType)}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      activeTab === tab.id
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
                />
                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              </form>
            </div>
          </div>

          {/* User menu indicator */}
          {session && (
            <div className="flex items-center px-3 py-2 text-sm text-gray-600 mr-4" data-testid="user-menu">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                <span className="text-white text-xs font-medium">
                  {session.user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-xs">
                {session.user?.email?.split('@')[0]}
              </span>
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
                  className={`flex items-center w-full px-3 py-2 text-base font-medium rounded-md ${
                    activeTab === tab.id
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