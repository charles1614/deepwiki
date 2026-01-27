'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useBreadcrumbRightContent } from './BreadcrumbsRightContent'
import { AiConnectionStatusIndicator } from '@/components/ai/AiConnectionStatus'

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
  const { content: rightContent } = useBreadcrumbRightContent()

  // Generate breadcrumb navigation
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const parts = (pathname || '').split('/').filter(Boolean)
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

  // Hide breadcrumbs on wiki list page (/wiki)
  if (pathname === '/wiki') {
    return null
  }

  // Show breadcrumbs if we have multiple items OR if there's right content to display
  // (right content includes Manage button, privacy toggle, etc.)
  if (breadcrumbs.length <= 1 && !rightContent) {
    return null
  }

  return (
    <nav
      className={`bg-gray-50 ${className}`}
      aria-label="Breadcrumb navigation"
      data-testid="breadcrumb-nav"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
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
          {rightContent && (
            <div className="flex items-center gap-3">
              {/* AI Connection Status Indicator */}
              <div data-testid="ai-connection-status-container">
                <AiConnectionStatusIndicator />
              </div>
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}