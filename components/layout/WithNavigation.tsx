'use client'

import React from 'react'
import { Navigation } from './Navigation'
import { Breadcrumbs } from './Breadcrumbs'
import { BreadcrumbRightContentProvider } from './BreadcrumbsRightContent'
import { AiConnectionStatusIndicator } from '@/components/ai/AiConnectionStatus'

interface WithNavigationProps {
  children: React.ReactNode
  className?: string
}

export function WithNavigation({ children, className = '' }: WithNavigationProps) {
  return (
    <BreadcrumbRightContentProvider>
      <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
        <Navigation />
        <Breadcrumbs />
        <main className={`flex-1 overflow-y-auto ${className}`}>
          {children}
        </main>
      </div>
    </BreadcrumbRightContentProvider>
  )
}