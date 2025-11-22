'use client'

import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { WithNavigation } from '@/components/layout/WithNavigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <WithNavigation>
        <div className="max-w-7xl mx-auto pt-6 pb-2 sm:px-6 lg:px-8">
          <div className="px-4 pt-6 pb-2 sm:px-0">
            {children}
          </div>
        </div>
      </WithNavigation>
    </ProtectedRoute>
  )
}
