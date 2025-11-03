'use client'

import React from 'react'
import { Navigation } from './Navigation'

interface WithNavigationProps {
  children: React.ReactNode
  className?: string
}

export function WithNavigation({ children, className = '' }: WithNavigationProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className={className}>
        {children}
      </main>
    </div>
  )
}