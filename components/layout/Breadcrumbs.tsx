'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface BreadcrumbProps {
  className?: string
}

interface Breadcrumb {
  label: string
  href: string
}

export function Breadcrumbs({ className = '' }: BreadcrumbProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Generate breadcrumb navigation
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const parts = pathname.split('/').filter(Boolean)
    let breadcrumbs: Breadcrumb[] = []

    if (parts.length === 0 || (parts.length === 1 && parts[0] === 'dashboard')) {
      // On home page (/dashboard) - show just "Dashboard"
      breadcrumbs = [{ label: 'Dashboard', href: '/dashboard' }]
    } else {
      // Start with "Home" for all other pages
      breadcrumbs = [{ label: 'Home', href: '/dashboard' }]

      if (parts[0] === 'wiki') {
        breadcrumbs.push({ label: 'Wiki', href: '/wiki' })

        if (parts.length > 1) {
          // This is a specific wiki page
          const wikiSlug = parts[1]
          breadcrumbs.push({
            label: wikiSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            href: `/wiki/${wikiSlug}`
          })
        }
      } else if (parts[0] === 'upload') {
        breadcrumbs.push({ label: 'Upload Wiki', href: '/upload' })
      } else if (parts[0] === 'search') {
        breadcrumbs.push({ label: 'Search', href: '/search' })
      }
      // Note: We don't add a separate "Dashboard" breadcrumb since it's already represented as "Home"
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  // Don't show breadcrumbs if we're on the home page with only "Home"
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav
      className={`bg-gray-50 ${className}`}
      aria-label="Breadcrumb navigation"
      data-testid="breadcrumb-nav"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 text-sm text-gray-500 pt-4 pb-1">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb.href}-${index}`}>
              {index > 0 && (
                <span
                  className="text-gray-300"
                  data-testid="breadcrumb-separator"
                  aria-hidden="true"
                >
                  /
                </span>
              )}
              {index === breadcrumbs.length - 1 ? (
                // Current page - not clickable
                <span
                  className="text-gray-900 font-medium"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                // Clickable breadcrumb
                <button
                  onClick={() => router.push(crumb.href)}
                  className="hover:text-gray-700 transition-colors"
                  aria-label={`Navigate to ${crumb.label}`}
                >
                  {crumb.label}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </nav>
  )
}