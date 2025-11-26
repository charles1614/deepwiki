'use client'

import React from 'react'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'
import { BreadcrumbRightContentProvider } from './BreadcrumbsRightContent'
import { AiConnectionProvider } from '@/lib/ai/AiConnectionContext'
import { AiConnectionStatusIndicator } from '@/components/ai/AiConnectionStatus'

interface WithNavigationProps {
  children: React.ReactNode
  className?: string
}

export function WithNavigation({ children, className = '' }: WithNavigationProps) {
  return (
    <AiConnectionProvider>
      <BreadcrumbRightContentProvider>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <Breadcrumbs />
          <main className={className}>
            {children}
          </main>
        </div>
      </BreadcrumbRightContentProvider>
    </AiConnectionProvider>
  )
}